<script setup>
import { ref, computed, onMounted } from "vue";
import { getAppeals, decideAppeal } from "../services/requests";
import { getErrorMessage } from "../services/errors";
import AlertMessage from "./AlertMessage.vue";

const emit = defineEmits(["changed"]);

const rows = ref([]);
const loading = ref(false);
const showAlert = ref(false);
const alertType = ref("success");
const alertMessage = ref("");

const waiting = computed(() => rows.value.filter((r) => !r.appealDecision));
const decided = computed(() => rows.value.filter((r) => !!r.appealDecision));

// The reply form: which appeal, which answer.
const target = ref(null);
const decision = ref("reopen");
const reply = ref("");
const busy = ref(false);

function say(type, text) {
  alertType.value = type;
  alertMessage.value = text;
  showAlert.value = true;
}

async function load() {
  loading.value = true;
  try {
    rows.value = await getAppeals();
  } catch (e) {
    say("danger", getErrorMessage(e));
  } finally {
    loading.value = false;
  }
}

function open(r, d) {
  target.value = r;
  decision.value = d;
  reply.value = "";
}

async function send() {
  if (reply.value.trim().length < 3) {
    say("danger", "Please write a short reply (at least 3 characters).");
    return;
  }
  busy.value = true;
  try {
    const res = await decideAppeal(target.value.id, decision.value, reply.value.trim());
    say("success", res.message);
    target.value = null;
    await load();
    emit("changed");
    window.dispatchEvent(new Event("cims:counts-changed"));
  } catch (e) {
    say("danger", getErrorMessage(e));
  } finally {
    busy.value = false;
  }
}

const fmt = (d) => (d ? new Date(d).toLocaleString("en-PH") : "");
const lines = (r) => [
  ...(r.items || []).map((i) => `${i.itemName} x${i.qty}`),
  ...(r.uniforms || []).map((u) => `${u.uniformName || "Uniform"} ${u.size || ""} x${u.quantity}`),
].join(", ");

onMounted(load);
defineExpose({ load });
</script>

<template>
  <div>
    <AlertMessage v-model:show="showAlert" :type="alertType" :message="alertMessage" />

    <div v-if="loading" class="text-muted py-3">Loading appeals...</div>

    <template v-else>
      <div v-if="!waiting.length" class="text-muted text-center py-4">No appeals are waiting.</div>

      <div v-for="r in waiting" :key="r.id" class="card shadow-sm mb-3">
        <div class="card-body">
          <div class="d-flex flex-wrap justify-content-between gap-2">
            <h6 class="mb-1">Request #{{ r.id }} &mdash; {{ r.requesterName || r.requester }}</h6>
            <span class="text-muted small">Appealed {{ fmt(r.appealedAt) }}</span>
          </div>
          <div class="small text-muted mb-2">{{ lines(r) }}</div>
          <div class="small"><strong>Purpose:</strong> {{ r.purpose }}</div>
          <div class="small text-danger">
            <strong>Rejected{{ r.rejectedByHead ? " by the program head" : "" }}:</strong> {{ r.rejectReason }}
          </div>
          <div class="border rounded p-2 mt-2 bg-light">
            <strong class="small">Requester's appeal:</strong>
            <div>{{ r.appealMessage }}</div>
          </div>
          <div class="mt-3 d-flex flex-wrap gap-2">
            <button class="btn btn-sm btn-success" @click="open(r, 'reopen')">Accept &amp; reopen</button>
            <button class="btn btn-sm btn-outline-danger" @click="open(r, 'uphold')">Keep rejected</button>
          </div>
        </div>
      </div>

      <h6 v-if="decided.length" class="mt-4">Answered appeals</h6>
      <div v-if="decided.length" class="table-responsive">
        <table class="table table-sm align-middle">
          <thead class="table-light">
            <tr><th>Request</th><th>Requester</th><th>Appeal</th><th>Answer</th><th>Reply</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in decided" :key="'d' + r.id">
              <td>#{{ r.id }}</td>
              <td>{{ r.requesterName || r.requester }}</td>
              <td class="small">{{ r.appealMessage }}</td>
              <td>
                <span class="badge" :class="r.appealDecision === 'Reopened' ? 'bg-success' : 'bg-secondary'">
                  {{ r.appealDecision === "Reopened" ? "Accepted" : "Kept rejected" }}
                </span>
                <div class="small text-muted">{{ r.appealDecidedBy }} &middot; {{ fmt(r.appealDecidedAt) }}</div>
              </td>
              <td class="small">{{ r.appealReply }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <div v-if="target" class="modal-backdrop-custom" @click.self="target = null">
      <div class="modal-custom">
        <div class="modal-header">
          <h5 class="mb-0">
            {{ decision === "reopen" ? "Accept appeal and reopen" : "Keep request rejected" }} &mdash; #{{ target.id }}
          </h5>
        </div>
        <div class="modal-body">
          <p class="small text-muted mb-2">
            {{ decision === "reopen"
              ? "The request goes back to " + (target.rejectedByHead ? "the program head's review." : "the AMO's queue.")
              : "The request stays rejected and the requester can make a new request." }}
            Write a short reply. The requester will be notified.
          </p>
          <label class="form-label small" for="appeal-reply">Reply to the requester</label>
          <textarea id="appeal-reply" name="appeal_reply" v-model="reply" maxlength="100" rows="3" class="form-control"></textarea>
          <div class="form-text text-end" :class="{ 'text-danger': (reply || '').length >= 100 }">{{ (reply || '').length }} / 100</div>
        </div>
        <div class="modal-footer d-flex justify-content-end gap-2">
          <button class="btn btn-secondary" :disabled="busy" @click="target = null">Cancel</button>
          <button class="btn" :class="decision === 'reopen' ? 'btn-success' : 'btn-danger'" :disabled="busy" @click="send">
            {{ decision === "reopen" ? "Accept appeal" : "Keep rejected" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
