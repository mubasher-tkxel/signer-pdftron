import React from "react";
import PdfViewer from "../components/PdfViewer";
import { ToastContainer } from "react-toastify";

const Home = () => {
  return (
    <>
      <PdfViewer />
      <ToastContainer />
    </>
  );
};

export default Home;
