import axios from "../axios";

// Longest student ID number allowed (digits and '-'). Everyone can read it.
export async function getStudentIdMaxLength() {
    return (await axios.get("/settings/student-id-length", { silent: true })).data.student_id_max_length;
}

export async function updateStudentIdMaxLength(value) {
    return (await axios.put("/settings/student-id-length", { student_id_max_length: value })).data;
}

// My own items-per-request limit (the Request page uses it).
export async function getMaxItemsPerRequest() {
    return (await axios.get("/settings/max-items", { silent: true })).data.max_items_per_request;
}

// AMO: both limits for every role -> { by_role: { admin: { items, monthly }, ... } }
export async function getRequestLimits() {
    return (await axios.get("/settings/request-limits")).data;
}

export async function updateRequestLimits(byRole) {
    return (await axios.put("/settings/request-limits", { by_role: byRole })).data;
}

export async function getMonthlyRequestLimit() {
    return (await axios.get("/settings/monthly-request-limit")).data;
}

// Default return period (days) per category for borrowed items (roadmap #8).
// Both values are a whole number of days, or null for "no default".
export async function getReturnPeriods() {
    return (await axios.get("/settings/return-periods")).data;
}

export async function updateReturnPeriods({ office_supplies, school_equipment }) {
    return (
        await axios.put("/settings/return-periods", {
            office_supplies,
            school_equipment,
        })
    ).data;
}

// Default stock levels (Critical / Minimum / Optimal) for School Equipment
// and Type B office supplies. AMO only.
export async function getStockLevels() {
    return (await axios.get("/settings/stock-levels")).data;
}

export async function updateStockLevels(payload) {
    return (await axios.put("/settings/stock-levels", payload)).data;
}

// Allowed sign-up email domains. AMO only; an empty list means any email is accepted.
export async function getEmailDomains() {
    return (await axios.get("/settings/email-domains")).data;
}

export async function updateEmailDomains(domains) {
    return (await axios.put("/settings/email-domains", { domains })).data;
}
