import React, { useContext, useEffect, useState } from "react";
import ErrorMessage from "./ErrorMessage";
import LeadModal from "./LeadModal";
import { UserContext } from "../context/UserContext";
import { DataGrid } from '';

const LeadsView = () => {
  const columns = [
    { field: 'url', headerName: 'Name', width: 259},  
    { field: 'title', headerName: 'Name', width: 259, editable: true},
    { field: 'company', headerName: 'Company',  width: 259, editable: true},
    { field: 'description', headerName: 'Description', width: 500 },
    { field: 'location', headerName: 'Location', width: 259, editable: true},
    { field: 'salary', headerName: 'Salary', width: 259, editable: true},
    { field: 'job_function', headerName: 'Job Function', width: 259, editable: true},
    { field: 'industries', headerName: 'Industries', width: 259, editable: true},
    { field: 'employment_type', headerName: 'Employment Type', width: 259, editable: true},
    { field: 'seniority_level', headerName: 'Seniority Level', width: 259, editable: true},
    { field: 'name', headerName: 'Name', width: 259, editable: true},
    { field: 'updatedAt', headerName: 'Updated At', type: 'dateTime', width: 259},
    { field: 'createdAt', headerName: 'Created At', type: 'dateTime', width: 259}
  ];

  const [token] = useContext(UserContext);
  const [leads, setLeads] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [activeModal, setActiveModal] = useState(false);
  const [id, setId] = useState(null);

  const handleUpdate = async (id) => {
    setId(id);
    setActiveModal(true);
  };

  const handleDelete = async (id) => {
    const requestOptions = {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    };
    const response = await fetch(`/leads/${id}`, requestOptions);
    if (!response.ok) {
      setErrorMessage("Failed to delete lead");
    }

    getLeads();
  };

  const getLeads = async () => {
    const requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    };
    const response = await fetch("/leads", requestOptions);
    if (!response.ok) {
      setErrorMessage("Something went wrong. Couldn't load the leads");
    } else {
      const data = await response.json();
      setLeads(data);
      setLoaded(true);
    }
  };

  useEffect(() => {
    getLeads();
  }, []);

  const handleModal = () => {
    setActiveModal(!activeModal);
    getLeads();
    setId(null);
  };
  return (
    <>
      <LeadModal
        active={activeModal}
        handleModal={handleModal}
        token={token}
        id={id}
        setErrorMessage={setErrorMessage}
      />
      <button
        className="button is-fullwidth mb-5 is-primary"
        onClick={() => setActiveModal(true)}
      >
        Create Lead
      </button>
      <ErrorMessage message={errorMessage} />
      {loaded && leads ? (
            <div style={{ height: 300, width: '100%' }}>
            <DataGrid rows={leads} columns={columns} />
          </div>
      ) : (
        <p>Loading</p>
      )}
    </>
  );
};


export default LeadsView;