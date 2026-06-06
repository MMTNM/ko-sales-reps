const BASE_URL = process.env.JOBNIMBUS_BASE_URL || "https://app.jobnimbus.com/api1";
const API_KEY = process.env.JOBNIMBUS_API_KEY;

function authHeaders() {
  if (!API_KEY) throw new Error("JOBNIMBUS_API_KEY is not set");
  return {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };
}

export interface JobNimbusContact {
  jnid?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  city?: string;
  state_text?: string;
  zip?: string;
  tags?: string[];
}

export interface JobNimbusJob {
  jnid?: string;
  name: string;
  primary?: string; // contact jnid
  description?: string;
  tags?: string[];
  work_type?: string;
  status_name?: string;
}

/**
 * Create a contact in JobNimbus and return the created record including jnid.
 */
export async function createContact(contact: JobNimbusContact): Promise<JobNimbusContact> {
  const res = await fetch(`${BASE_URL}/contacts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(contact),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`JobNimbus createContact failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Create a job/work order in JobNimbus linked to an existing contact.
 */
export async function createJob(job: JobNimbusJob): Promise<JobNimbusJob> {
  const res = await fetch(`${BASE_URL}/jobs`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(job),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`JobNimbus createJob failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Fetch a contact by jnid.
 */
export async function getContact(jnid: string): Promise<JobNimbusContact> {
  const res = await fetch(`${BASE_URL}/contacts/${jnid}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`JobNimbus getContact failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Fetch a job by jnid.
 */
export async function getJob(jnid: string): Promise<JobNimbusJob> {
  const res = await fetch(`${BASE_URL}/jobs/${jnid}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`JobNimbus getJob failed (${res.status}): ${text}`);
  }

  return res.json();
}
