import React from "react";

// Define a type for the component's props
interface ErrorMessageProps {
  message: string;
}

// Use the ErrorMessageProps type for the component's props
const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => (
  <p className="has-text-weight-bold has-text-danger">{message}</p>
);

export default ErrorMessage;
