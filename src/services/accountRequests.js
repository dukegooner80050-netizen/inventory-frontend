import axios from "../axios";
import { cached } from "./sharedCache";

// Admin side of account approval (people who signed up and are waiting).

export async function listAccountRequests() {
  return cached("account-requests", fetchAccountRequests);
}

async function fetchAccountRequests() {
  return (await axios.get("/account-requests")).data;
}

export async function approveAccountRequest(id, role, iddept = null) {
  return (await axios.post(`/account-requests/${id}/approve`, { role, iddept: iddept || null })).data;
}

export async function declineAccountRequest(id) {
  return (await axios.post(`/account-requests/${id}/decline`)).data;
}
