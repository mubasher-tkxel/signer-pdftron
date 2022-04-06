import React, { useRef, useEffect, useState } from "react";
import WebViewer from "@pdftron/webviewer";
import TickIcon from "../assets/cbimage.png";
import Whiteimg from "../assets/whiteimg.png";
import ParseBtn from "../assets/parser.png";
import SignaturePad from "react-signature-canvas";
import { Button, Modal } from "react-bootstrap";
import {
  CANVAS_PROPS,
  loadSignAnnotations,
  signatureClicked,
  viewers,
  WEBVIEWER_FILE_PATH,
  writeSignatureImageMethod,
} from "../utility/signature";
import { extractDataFromPDF, extractTitle } from "../utility/parser";
import {
  FIELD_INSTANCE_NAME,
  DIFFERENCE_KEY_NAME,
  SIGN_OBJECTS_NAME,
  SIGN_FIELD_NAME,
} from "../utility/localstorage";
import { toast } from "react-toastify";
import "./PdfViewer.css";

const PdfViewer = () => {
  const [show, setShow] = useState(false);

  const handleCloseSignatureModal = () => setShow(false);
  const handleShowSignatureModal = () => setShow(true);
  const viewer = useRef(null);
  const sigRef = useRef(null);

  useEffect(() => {
    WebViewer(
      {
        path: WEBVIEWER_FILE_PATH,
        initialDoc: viewers[0].initialDoc,
        fullAPI: true,
        loadAsPDF: true,
      },
      viewer.current,
      document.getElementById(`${viewer.domElement}`)
    )
      .then(async (instance) => {
        const {
          documentViewer,
          PDFNet,
          Annotations,
          annotationManager,
        } = instance.Core;

        const { Feature } = instance.UI;
        instance.UI.enableFeatures([Feature.FilePicker]);
        instance.UI.disableElements(["signatureModal"]);

        const signatureTool = documentViewer.getTool(
          "AnnotationCreateSignature"
        );

        /* Detect Signature click */
        signatureTool.addEventListener("locationSelected", (e) => {
          handleShowSignatureModal();
          signatureClicked(
            e,
            SIGN_OBJECTS_NAME,
            FIELD_INSTANCE_NAME,
            DIFFERENCE_KEY_NAME
          );
        });

        /* detect if the document loaded */
        documentViewer.addEventListener("documentLoaded", async () => {
          await loadSignAnnotations(instance, Annotations, annotationManager);
        });

        instance.UI.setHeaderItems((header) => {
          header.push({
            type: "actionButton",
            img: TickIcon,
            onClick: async () => {
              const mainFunc = async () => {
                try {
                  const newDoc = await documentViewer.getDocument();
                  await writeSignatureImageMethod(
                    PDFNet,
                    newDoc,
                    Whiteimg,
                    toast,
                    documentViewer,
                    annotationManager,
                    FIELD_INSTANCE_NAME,
                    SIGN_FIELD_NAME
                  );

                  /* Update viewer with new document */
                  documentViewer.refreshAll();
                  documentViewer.updateView();
                } catch (error) {
                  console.log(error);
                }
              };
              PDFNet.runWithCleanup(mainFunc);
            },
          });
          header.push({
            type: "actionButton",
            img: ParseBtn,
            onClick: async () => {
              async function main() {
                const newDoc = await documentViewer.getDocument();
                const doc = await newDoc.getPDFDoc();
                const page = await doc.getPage(1);

                const txt = await PDFNet.TextExtractor.create();
                const rect = await page.getCropBox();
                txt.begin(page, rect); // Read the page.

                let parsedData = {};

                /* Extract words one by one. */
                let line = await txt.getFirstLine();

                let docTitle = "";
                /*  extracting title */
                await extractTitle(line, docTitle, parsedData);
                let key = "";
                let value = "";

                await extractDataFromPDF(line, key, value, parsedData);
                /* add signatures in parsed data */
                let signs = localStorage.getItem(SIGN_FIELD_NAME);
                if (signs) {
                  signs = JSON.parse(signs);
                  parsedData = { ...parsedData, ...signs };
                }
                console.log(parsedData);
              }
              PDFNet.runWithCleanup(main);
            },
          });
        });
      })
      .catch((err) => console.log(err));
  }, []);

  const saveSigData = (bsString) => {
    localStorage.setItem("signImg", bsString);
    handleCloseSignatureModal();
  };

  return (
    <div className="App">
      <div className="header">React sample</div>
      <Modal centered show={show} onHide={handleCloseSignatureModal}>
        <Modal.Header closeButton>
          <Modal.Title>Modal heading</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <input
            hidden={true}
            onChange={(e) =>
              localStorage.setItem(DIFFERENCE_KEY_NAME, e.target.value)
            }
            className="input_width"
          />

          <div className="signaturePad__header">
            <div className="signaturePad__container">
              <SignaturePad
                penColor="green"
                canvasProps={CANVAS_PROPS}
                ref={sigRef}
              />
            </div>
          </div>
          <Button
            variant="primary"
            onClick={async () =>
              saveSigData(await sigRef.current.toDataURL("base64string"))
            }
          >
            Add Signature
          </Button>
        </Modal.Body>
      </Modal>
      <div className="webviewer" ref={viewer}></div>
    </div>
  );
};

export default PdfViewer;
