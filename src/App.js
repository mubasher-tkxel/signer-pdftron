import React from "react";
import PdfViewer from "./components/PdfViewer";
import { ToastContainer } from "react-toastify";
import "./App.css";

const App = () => {
  return (
    <>
      <PdfViewer />
      <ToastContainer />
    </>
  );
};

export default App;
