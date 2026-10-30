const statusClasses = {
  Pending: "status pending",
  Reviewed: "status reviewed",
  Shortlisted: "status shortlisted",
  Rejected: "status rejected",
  Withdrawn: "status withdrawn",
  Open: "status open",
  Closed: "status closed"
};

const StatusBadge = ({ status }) => {
  return <span className={statusClasses[status] || "status"}>{status}</span>;
};

export default StatusBadge;
