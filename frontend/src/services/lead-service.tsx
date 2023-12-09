import {components} from '../schema.d';

export type LeadRead = components['schemas']['LeadRead'];
export type LeadUpdate = components['schemas']['LeadUpdate'];
export type LeadCreate = components['schemas']['LeadCreate'];
export type Pagination = components['schemas']['Pagination'];
export type LeadsPaginatedRead = components['schemas']['LeadsPaginatedRead'];


export const getLeads = async (pagination: Pagination): Promise<LeadsPaginatedRead | null> => {
  const requestOptions = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };
  const response = await fetch(`/leads/?page=${pagination.page}&page_size=${pagination.page_size}`, requestOptions);

  if (!response.ok) {
    return null;
  }
  const leadsData: LeadsPaginatedRead = await response.json();
  return leadsData;
}

export const getLead = async (id: string): Promise<LeadRead | null> => {
  const requestOptions = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };
  const response = await fetch(`/leads/${id}`, requestOptions);

  if (!response.ok) {
    return null;
  }
  const leadData: LeadRead = await response.json();
  return leadData;
}


export const createLead = async (lead: LeadCreate): Promise<LeadRead | null> => {
  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(lead),
  };
  const response = await fetch("/leads", requestOptions);

  if (!response.ok) {
    return null;
  }
  const leadData: LeadRead = await response.json();
  return leadData;
}


export const updateLead = async (id: string, lead: LeadUpdate): Promise<LeadRead | null> => {
  const requestOptions = {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(lead),
  };
  const response = await fetch(`/leads/${id}`, requestOptions);

  if (!response.ok) {
    return null;
  }
  const leadData: LeadRead = await response.json();
  return leadData;
}

export const deleteLead = async (id: string): Promise<boolean> => {
  const requestOptions = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  };
  const response = await fetch(`/leads/${id}`, requestOptions);

  if (!response.ok) {
    return false;
  }
  return true;
}
