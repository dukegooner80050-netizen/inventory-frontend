<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import axios from "../axios";
import AlertMessage from "../components/AlertMessage.vue";

const router = useRouter();

const fullName = ref("");
const username = ref("");
const password = ref("");
const confirmPassword = ref("");
const employeeId = ref("");
const email = ref("");

// Step 2: enter the code that was emailed
const step = ref("form"); // "form" | "verify"
const code = ref("");
const maskedEmail = ref("");
const resendIn = ref(0);
const busy = ref(false);
let timer = null;

function startCooldown(seconds) {
  resendIn.value = seconds;
  clearInterval(timer);
  timer = setInterval(() => {
    resendIn.value = Math.max(0, resendIn.value - 1);
    if (resendIn.value === 0) clearInterval(timer);
  }, 1000);
}
onBeforeUnmount(() => clearInterval(timer));

function showError(e) {
  alertType.value = "danger";
  alertMessage.value =
    e.response?.data?.message ||
    (e.response?.data?.errors ? Object.values(e.response.data.errors).flat().join(", ") : "Something went wrong.");
  showAlert.value = true;
}

async function verifyCode() {
  busy.value = true;
  try {
    await axios.post("/register/verify", { username: username.value, code: code.value.trim() });
    alertType.value = "success";
    alertMessage.value = "Email verified. Please wait for an administrator to approve your account.";
    showAlert.value = true;
    clearInterval(timer);
    setTimeout(() => router.push("/login"), 4000);
  } catch (e) {
    showError(e);
  } finally {
    busy.value = false;
  }
}

async function resendCode() {
  busy.value = true;
  try {
    const res = await axios.post("/register/resend", { username: username.value });
    code.value = "";
    startCooldown(res.data.resend_seconds || 60);
    alertType.value = "success";
    alertMessage.value = "A new code was sent to your email.";
    showAlert.value = true;
  } catch (e) {
    if (e.response?.data?.retry_after) startCooldown(e.response.data.retry_after);
    showError(e);
  } finally {
    busy.value = false;
  }
}

function startOver() {
  clearInterval(timer);
  step.value = "form";
  code.value = "";
  showAlert.value = false;
}
const requestedRole = ref("");
const requestedDept = ref("");
const departments = ref([]);
const needsDept = computed(() => ["instructor", "department_head"].includes(requestedRole.value));

onMounted(async () => {
  try {
    departments.value = (await axios.get("/public/departments", { silent: true })).data;
  } catch {
    departments.value = [];
  }
});
const showAlert = ref(false);
const alertType = ref("success");
const alertMessage = ref("");

async function submit() {
  if (password.value !== confirmPassword.value) {
    alertType.value = "danger";
    alertMessage.value = "Passwords do not match.";
    showAlert.value = true;
    return;
  }

  try {
    busy.value = true;
    const res = await axios.post("/register", {
      email: email.value.trim(),
      full_name: fullName.value,
      username: username.value,
      password: password.value,
      employee_id: employeeId.value.trim(),
      requested_role: requestedRole.value,
      requested_iddept: needsDept.value ? requestedDept.value || null : null,
    });

    // Not submitted to the AMO yet: the email must be verified first.
    maskedEmail.value = res.data.email_masked;
    startCooldown(res.data.resend_seconds || 60);
    step.value = "verify";
    code.value = "";
    showAlert.value = false;
  } catch (e) {
    if (e.response?.data?.message) {
      alertType.value = "danger";
      alertMessage.value = e.response.data.message;
      showAlert.value = true;
    } else if (e.response?.data?.errors) {
      alertType.value = "danger";
      alertMessage.value = Object.values(e.response.data.errors)
        .flat()
        .join(", ");
      showAlert.value = true;
    } else {
      alertType.value = "danger";
      alertMessage.value = "Something went wrong.";
      showAlert.value = true;
    }
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="auth-bg">
    <div class="card shadow signup-card p-4">
      <AlertMessage
        v-model:show="showAlert"
        :type="alertType"
        :message="alertMessage"
      />
      <div class="text-center mb-3">
        <h3 class="fw-bold">Create Account</h3>
        <p class="text-muted">C.I.M.S Registration</p>
      </div>

      <form v-if="step === 'verify'" @submit.prevent="verifyCode">
        <p class="mb-2">
          We sent a 6-digit code to <strong>{{ maskedEmail }}</strong>. It expires in 10 minutes.
        </p>
        <div class="mb-3">
          <label class="form-label" for="signup-code">Verification code</label>
          <input
            id="signup-code"
            name="code"
            v-model="code"
            class="form-control form-control-lg text-center"
            inputmode="numeric"
            pattern="[0-9]{6}"
            maxlength="6"
            autocomplete="one-time-code"
            placeholder="000000"
            required
          />
        </div>
        <button class="btn btn-primary w-100" :disabled="busy || code.trim().length !== 6">Verify</button>
        <div class="d-flex justify-content-between mt-3 small">
          <button type="button" class="btn btn-link p-0" :disabled="busy || resendIn > 0" @click="resendCode">
            {{ resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code" }}
          </button>
          <button type="button" class="btn btn-link p-0" @click="startOver">Wrong email? Start over</button>
        </div>
      </form>

      <form v-else @submit.prevent="submit">
        <div class="mb-2">
          <label class="form-label" for="signup-fullname">Full Name</label>
          <input
            id="signup-fullname"
            name="full_name"
            v-model="fullName"
            class="form-control"
            autocomplete="name"
            required
          />
        </div>

        <div class="mb-2">
          <label class="form-label" for="signup-role">I am signing up as</label>
          <select id="signup-role" name="requested_role" v-model="requestedRole" class="form-select" required>
            <option value="" disabled>Select your role</option>
            <option value="instructor">Instructor</option>
            <option value="department_head">Program Head</option>
            <option value="admin">Admin (office staff)</option>
            <option value="cashier">Cashier</option>
          </select>
          <div class="form-text">The AMO will check this before approving your account.</div>
        </div>

        <div v-if="needsDept" class="mb-2">
          <label class="form-label" for="signup-dept">Department</label>
          <select id="signup-dept" name="requested_iddept" v-model="requestedDept" class="form-select" required>
            <option value="" disabled>Select your department</option>
            <option v-for="d in departments" :key="d.iddept" :value="d.iddept">{{ d.dept_name }}</option>
          </select>
        </div>

        <div class="mb-2">
          <label class="form-label" for="signup-email">Email</label>
          <input
            id="signup-email"
            name="email"
            v-model="email"
            type="email"
            class="form-control"
            autocomplete="email"
            maxlength="120"
            required
          />
          <div class="form-text">We will email you a code to confirm it.</div>
        </div>

        <div class="mb-2">
          <label class="form-label" for="signup-empid">Employee ID</label>
          <input
            id="signup-empid"
            name="employee_id"
            v-model="employeeId"
            class="form-control"
            maxlength="30"
            required
            autocomplete="off"
            placeholder="Letters, numbers and a dash"
          />
          <div class="form-text">Helps the AMO confirm who you are.</div>
        </div>

        <div class="mb-2">
          <label class="form-label" for="signup-username">Username</label>
          <input
            id="signup-username"
            name="username"
            v-model="username"
            class="form-control"
            autocomplete="username"
            required
          />
        </div>

        <div class="mb-2">
          <label class="form-label" for="signup-password">Password</label>
          <input
            id="signup-password"
            name="password"
            v-model="password"
            type="password"
            class="form-control"
            autocomplete="new-password"
            required
          />
        </div>

        <div class="mb-3">
          <label class="form-label" for="signup-confirm">Confirm Password</label>
          <input
            id="signup-confirm"
            name="password_confirmation"
            v-model="confirmPassword"
            type="password"
            class="form-control"
            autocomplete="new-password"
            required
          />
        </div>

        <button class="btn btn-primary w-100" :disabled="busy">{{ busy ? "Sending code…" : "Sign Up" }}</button>
      </form>

      <div class="text-center mt-3">
        <small>
          Already have an account?
          <RouterLink to="/login">Login</RouterLink>
        </small>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-bg {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #2563eb, #31ce12);
}
.signup-card {
  width: 100%;
  max-width: 460px;
  border-radius: 14px;
}
</style>
