import React, { useRef, useEffect, useState } from "react";
import WebViewer from "@pdftron/webviewer";
import SignaturePad from "react-signature-canvas";
import { Button, Modal } from "react-bootstrap";

import { toast } from "react-toastify";

const PdfViewer = () => {
  const [show, setShow] = useState(false);

  const handleCloseSignatureModal = () => setShow(false);
  const handleShowSignatureModal = () => setShow(true);
  const viewer = useRef(null);
  const sigRef = useRef(null);

  const viewers = [
    {
      initialDoc: "/files/pdf-new.pdf",
      domElement: "leftPanel",
    },
    {
      initialDoc: "https://pdftron.s3.amazonaws.com/downloads/pl/report.docx",
      domElement: "rightPanel",
    },
  ];

  useEffect(() => {
    WebViewer(
      {
        path: "/webviewer/lib",
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

          let getAllItems = localStorage.getItem("AllSignObjects");
          getAllItems = JSON.parse(getAllItems);

          const keys = Object.keys(getAllItems);
          const cordinatesDifferenceInstances = [];
          let cordinateDifference = 0;

          for (const a of keys) {
            const obj = getAllItems[a];
            cordinateDifference = Math.abs(obj["y"] - e.y);
            cordinatesDifferenceInstances.push({
              key: a,
              difference: cordinateDifference,
              fieldName: obj.fieldName,
            });
          }

          /* get lowest differene obj */
          let minimumDifferenceInstance = {
            difference: 999,
            fieldName: "",
          };

          cordinatesDifferenceInstances.forEach((item) => {
            if (item.difference < minimumDifferenceInstance.difference) {
              minimumDifferenceInstance = item;
            }
          });

          localStorage.setItem("field", minimumDifferenceInstance.key);
          localStorage.setItem(
            "fieldName",
            minimumDifferenceInstance.fieldName
          );
        });

        /* detect if the document loaded */
        documentViewer.addEventListener("documentLoaded", async () => {
          localStorage.removeItem("signs");

          const doc = instance.Core.documentViewer.getDocument();
          const pageText = await doc.loadPageText(1);
          let text = await doc.loadPageText(1);

          text = text.split("\n");
          let signCordinateInstance = {};
          let signFieldCount = 0;

          for (const t of text) {
            const result = /\{\{\w:\w;\w:\w;\w:[”"]\w+[”"];\}\}/gi.exec(t);

            if (result) {
              const key = result[0];
              const startIndex = pageText.indexOf(key);
              const endIndex = startIndex + key.length;

              const quadsForRectangle = await doc.getTextPosition(
                1,
                startIndex,
                endIndex + 1
              );

              /* set flags for required */
              const flags = new Annotations.WidgetFlags();
              flags.set("Required", true);

              /* create a form field */
              const formField = new Annotations.Forms.Field(
                `Sign here ${signFieldCount}`,
                {
                  type: "Sig",
                  flags,
                }
              );

              signCordinateInstance[key] = {
                x: startIndex,
                y: quadsForRectangle[quadsForRectangle.length - 1].y2,
                fieldName: `Sign here ${signFieldCount}`,
              };

              signFieldCount++;

              /* create a widget annotation */
              const widgetAnnot = new Annotations.SignatureWidgetAnnotation(
                formField,
                {
                  appearance: "_DEFAULT",
                  appearances: {
                    _DEFAULT: {
                      Normal: {
                        data:
                          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjEuMWMqnEsAAAANSURBVBhXY/j//z8DAAj8Av6IXwbgAAAAAElFTkSuQmCC",
                        offset: {
                          x: 100,
                          y: 100,
                        },
                      },
                    },
                  },
                }
              );

              /* set position and size */
              widgetAnnot.PageNumber = 1;
              widgetAnnot.X = quadsForRectangle[0].x1 + 2;
              widgetAnnot.Y = quadsForRectangle[0].y1 - 20;
              widgetAnnot.Width = 60;
              widgetAnnot.Height = 25;
              widgetAnnot.LockedContents = false;
              widgetAnnot.Locked = false;
              widgetAnnot.FillColor = new Annotations.Color(255, 255, 255);
              widgetAnnot.StrokeColor = new Annotations.Color(255, 255, 255);

              /* add the form field and widget annotation */
              annotationManager.getFieldManager().addField(formField);
              annotationManager.addAnnotation(widgetAnnot);
              annotationManager.drawAnnotationsFromList([widgetAnnot]);
            }
          }

          localStorage.setItem(
            "AllSignObjects",
            JSON.stringify(signCordinateInstance)
          );
        });

        instance.UI.setHeaderItems((header) => {
          header.push({
            type: "actionButton",
            img:
              "data:image/png;base64,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",
            onClick: async () => {
              const mainFunc = async () => {
                try {
                  const newDoc = await documentViewer.getDocument();

                  const builderWhiteImage = await PDFNet.ElementBuilder.create(); // ElementBuilder, used to build new element Objects

                  /* create a new page writer that allows us to add/change page elements */
                  const writerWhiteBackgound = await PDFNet.ElementWriter.create(); // ElementWriter, used to write elements to the page

                  await writerWhiteBackgound.beginOnPage(
                    await (await newDoc.getPDFDoc()).getPage(1),
                    PDFNet.ElementWriter.WriteMode.e_overlay
                  );

                  let signImg = localStorage.getItem("signImg");

                  let whiteimage = await PDFNet.Image.createFromURL(
                    await newDoc.getPDFDoc(),
                    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALIAAABCCAYAAADzGIxxAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAC9SURBVHhe7dIBDQAADMOg+ze9+2hAAzcIEJkEkUkQmQSRSRCZBJFJEJkEkUkQmQSRSRCZBJFJEJkEkUkQmQSRSRCZBJFJEJkEkUkQmQSRSRCZBJFJEJkEkUkQmQSRSRCZBJFJEJkEkUkQmQSRSRCZBJFJEJkEkUkQmQSRSRCZBJFJEJkEkUkQmQSRSRCZBJFJEJkEkUkQmQSRSRCZBJFJEJkEkUkQmQSRSRCZBJFJEJkEkUkQmQSRSRCZgO0Bb87jGyffi20AAAAASUVORK5CYII="
                  );

                  let signatureImg = await PDFNet.Image.createFromURL(
                    await newDoc.getPDFDoc(),
                    signImg
                  );

                  /* getting search item from storage */
                  let searchTerm = localStorage.getItem("field");
                  const pageNumber = 1; // page to parse
                  const pageText = await newDoc.loadPageText(pageNumber);
                  let startIndex = 0;
                  let endIndex = 0;

                  startIndex = pageText.indexOf(searchTerm);

                  if (startIndex >= 0) {
                    let allSignaturedIndexes =
                      localStorage.getItem("signs") || {};

                    if (typeof allSignaturedIndexes === "string") {
                      allSignaturedIndexes = JSON.parse(allSignaturedIndexes);
                    }

                    const indexExist =
                      allSignaturedIndexes[localStorage.getItem("field")];

                    if (indexExist) {
                      toast.warn("Signature Already exist", {
                        position: "top-right",
                        autoClose: 5000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                        progress: undefined,
                      });

                      return;
                    }

                    endIndex = startIndex + searchTerm.length;
                    const quadsForRectangle = await newDoc.getTextPosition(
                      pageNumber,
                      startIndex,
                      endIndex + 1
                    );

                    let pageHeight = await documentViewer.getPageHeight(1);
                    let element = await builderWhiteImage.createImageScaled(
                      whiteimage,
                      quadsForRectangle[0].x2 - 3,
                      pageHeight - quadsForRectangle[0].y2,
                      110,
                      20
                    );

                    writerWhiteBackgound.writePlacedElement(element);
                    writerWhiteBackgound.end();

                    /* Created second instance for writing signature image */
                    const writerSignatureImage = await PDFNet.ElementWriter.create();
                    await writerSignatureImage.beginOnPage(
                      await (await newDoc.getPDFDoc()).getPage(1),
                      PDFNet.ElementWriter.WriteMode.e_overlay
                    );

                    const builderSignatureImage = await PDFNet.ElementBuilder.create();
                    let element2 = await builderSignatureImage.createImageScaled(
                      signatureImg,
                      quadsForRectangle[0].x2,
                      pageHeight - quadsForRectangle[0].y2 - 35,
                      150,
                      100
                    );

                    writerSignatureImage.writePlacedElement(element2);
                    writerSignatureImage.end();

                    /* remove signture annotation after sign */
                    const fieldManager = annotationManager.getFieldManager();
                    const field = fieldManager.getField(
                      localStorage.getItem("fieldName")
                    );
                    annotationManager.deleteAnnotation(field.widgets);

                    /* add the page to the document */
                    let newPdfDoc = await newDoc.getPDFDoc();
                    if (newPdfDoc) {
                      let newPdfDocPage = await newPdfDoc.getPage(1);
                      if (newPdfDocPage) {
                        try {
                          // save sign in local
                          let signs = localStorage.getItem("signs");
                          if (signs) {
                            signs = JSON.parse(signs);
                            signs[searchTerm] = signImg;
                            localStorage.setItem(
                              "signs",
                              JSON.stringify(signs)
                            );
                          } else {
                            let signingTerm = {};
                            signingTerm[searchTerm] = signImg;
                            localStorage.setItem(
                              "signs",
                              JSON.stringify(signingTerm)
                            );
                          }
                        } catch (error) {
                          console.log(error);
                        }
                      }
                    }

                    /* Update viewer with new document */
                    documentViewer.refreshAll();
                    documentViewer.updateView();
                  }
                } catch (error) {
                  console.log(error);
                }
              };
              PDFNet.runWithCleanup(mainFunc);
            },
          });
          header.push({
            type: "actionButton",
            img:
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANsAAADmCAMAAABruQABAAAAkFBMVEX29vYAAAD6+vr+/v7///+BgYHAwMDIyMjq6urMzMz09PSysrLY2Njv7+/b29vn5+eVlZVhYWG8vLycnJwxMTHLy8tPT0/S0tI+Pj7i4uJYWFiYmJioqKiKiooqKioODg5sbGwcHBwjIyNzc3NGRkaOjo55eXk6OjpnZ2cVFRWjo6MLCwsnJyddXV1LS0tDQ0Nwk7tTAAALtElEQVR4nO1daVfyOhCGSYBCKataUVQWEcHt//+7K4vQJdskmeblHp5PniOQPG2W2adWu+KKK6644oorrigCCgg9H28AlqStHLod9v+gx28f6iXMeiz0vNwBsCwz22H1PyB3J6ZWr79dOjnekFGr16eXTQ5SObV6PbroA4VJNtsB44t+cUxFrX53ydxgouT2cclrErpKbvVE+kVgjAUWX36nUEtqUiHDkhuwaLRqrOJJSOmF9R+/N/X5wzQR7xw7bpD8XRyzSagdyWqr0yxjLvqEFTeWfpw/8dQJwQ5YnJlD/Uk0Bxtuxe/ElS9M4Olrfg5bATkrbovCh+5TXik7FpUv5Ul5Bhbc2KD8sVm/uoUJMBZM9Ku85XTc+qXHAZHwg4NaNeyAjYrL5oBWeaYtNbdR6RtsJv7kfFTFtmMTgaq5x02ZW6zmNiy+aoVsPeyQk2NN+VRLSgtTaDh7dAvzZa/yz953iKlBWzXVpDjVew23df5pMOV7fifecx3lVIf50TWi8g6N7KqUHCQntElXJRMdkNlHW8sOr12SvxhnyIHU/nBAaXt6BdxopvrcPIvvBq/tF9vThNmb7rOk1Axmex9HnO3sq6z2Y8Kt3jic7lKDWAY9wkWpPklO+HmK015vpHvHf/iecADe0507v0gpud0aTheJRit+N/kc6Xvr0XAzBe0N96GfAB0eSM9Jk1OdDmWB1SfMjnUiUJv8+FM4bpQnyR6dl1DUGqS7bQe1OEuJoiBOQc7gjqWAyB7jG4ayiW88V2JU4EYihG9U4/PRGXhoQKu7ncA1ahYJBBZCCsA0ALeyuY+GWwjhhPzi/iM3r54brSx5BjdTqL1iK+RmHT8l/R4LcJjMBBIXY/00jRj6dgAG/Ulf7BLl6+q51cvm9Wg13/3jZou0OLPe287oP192y+x0ZkQaNPPzyPpbNm3EqwM466DLqPBFUMX60OE9Z6XlzefsP0cIcrkN9Zjdd8D7QWSu7C0AvFf0txhfEbzgKFqM9gbVnc0RUq2BlAoPR/cp8El54Xwbvjgou2ru4knSiXqjxnPpX9WhkeyCTqKRcN2UXXlibqZG08rxPXyQzW1uRI1tK52vLwwMViUkoWdpCQNpmgc7LBwhklwKry2I5ukFWk9ICFnRE+41Ow5GoWfogFhDThw6chl4Ufp5dP7sfxyqnAPoh56dIxQWI703/R+H4gIPopj5xI+Umy78ygGLr8Z4Go+ao3g6bnzRHVjS04St9F/G42W2TXcSPDvmvu3+TNLtbEMxWCTl5l+hfn5Ka0xgdNkFqKcr/xpTde9t1hbxyvBr6+NlUHitar8NEm2gMfBEEMNrj0c5N5/X26NZ3iWwzqO/QRV6jiyiFo+3onVMARb5ulZVTjpfXowbXNg78NSLGWOmfJ6qiF1zPKGN9AAeYjsamqXCNJHhJmjZBEtw14F/Ur3eLchqQOHeMlEB+i4BEC9GqS3Au4pgby2GNVtHGdSG1qMapyQBG81tB3lzSVGwVUN+MKlkrGZ5ozrGJdkJfa/Io4t1bWQ953R0qzeHTqWGDt7gNXSPb2H4PWeRAg+6aP0S7n242wF7Wi5sRoUOUoX0kmaPdsrKxWPlMLiock9RErq8siIsA09QwU0rX6GbHKVFflrucUxwk5fNdhwWs+Vsj2aBA1WKYiabCzeMu2VqOS4zF869BhNjAiEsdznmyPKacYFxb1qm6PAv4xE8BxMj3NJ23Li538PMkY7B3HRonV9KCIbwxHkPJjb3J60tAvE4xskorUNiDfMdd5cg1SrgmEAMnaHCAhhtZ3BMlDSqRgcsQsVsebzbTlNAhRQ8jJvdfnRAIjBl730Qe0APZ3S6p0iUsU8fWT8V1HCAZuP75gDsj5GkJTh5p3MuRtZ2MH6ShIC7pX9mUviZS8S/rSSuAXNyQJ5kQMxVJvgZIm5uzsA/ecUtOi2midx3dJh9HZ44QtwXgSjjwjXf+ihPzF1+Qx2M4wDH7M/9onR0TMndsI5Q1WkxwD7m3rGQwJKMm5vT5cDNzTtkEktrx83NE+6DG9Ex6XxQ+uDWJOPm5sP1wY0sMc3HM3f8DbJ6Keo6uFduV25SkCVeO96713NSDcMEJgtubuH8PriR1adwzHnywY1INXVWTn1weyDjJqtzaYb9Ged41lr50k1QKmqLwyFy2THhjaqKg1ug6nE5OaZOEQmUjlvl9ph463aREClwburb8s+Gx5127TdNbSn+7TCnu3MueOIUqC/NN3CCS/5MI+PPgcRly5Fo3vZa964GRO6XWGxf2+KdYlFyTNDa59u01e0dEEHJRwVs0oyPGDdw5jP/blPUxTRMgWl6XZ3/yxjvjBCrlECkRAiTLXSZemBN40SnNYHf1HiLpFaBChPjIqHedTjzK9dys5t75bxXvTQXlSwlB4Q/3bPchZC3bLmZe4l0KfFIIBz5ljGGGOXHKvRISg1xb1tuB4zBwqcXDlCeN7vdwDBJd2/+hBNclRG7wB2cUu/tOEEqbnbRLeo+CEVsPNWahQSXHL224Ya1D975WZXoyp23Fs+UmYe9HvDkgxy+OLXFM7UoruOhOaRNhBL+/rGxEDWd86isTDfYPrDcyhTTciNnm+2KUnPANsTP6c3ZZykPjTMXgXetjUziJndG4C6BCYYZp2558gNbcna74ISNQaawuAEaAnZNsVyyhI941VnvWepcVOTTQs1n6afrsHVdSKBbmOgfVsiEBAA/lT4WKoubr2p4z23EqQzcJVo6B5Wj09y8pMNwYsgO+MR5p50hz3l19OjksewZsAPW81pWR26/dwxZLGLYLNuv88Sg5fGd7SBflMx34aXFoCvpebyzXncH3gt1ycuzdAhaMs3fmn04FOc6ktrRgn6zMfc/mCoKl6j5zfNwELcnUZJ0kiSatOPVO1UtY3kmO3l/GPJWXfLIOcdMgfBQ2IBD93dzhsrY5vkSqBpfKkH2wguHqhvNoGzJ/xp0YXMheqj4gs4nccEFlvUmxIstjG3gdb/YguYmtvMLLURv5NQP0yLGGWaNxiR211nci5KoGaLvzwnz5XjUak4FEoaq3HfuzZVtTpttjR97rQTr5rFZ9fhBWeKdYpz2woyZyHP5CKfHEqjfYv0jzirxbJJ36pon9BZiTme5kpJB2vbV10mhSALLdDb6xOQqZ0Wvn0Lx1jC3e1kxA9jO9//6GONqXrL0+M5vBGb2ANQ2otkz1o2ncQpYMzawSTxYTVOBoSpEE9C1+PYyKsci/J7ERBWiOdANeTPhI2mizvIqbKqhFqZPZkX9TYO0hyBLIy8gRMeqr2o2XJjG8tUsyjCXt8dAPwWKLQsrQhVdd0Mp5krjoycEM6iQZVufEM4Q9ky/KMN1GiNLtz7CsRqMGyiSms4IaygyNYrYIayHjlZidqtS5wzSO85MlHyn6s1LeQ0YOVYHHc4QaSfL7XawNHS0kxXdqBmJyZvuXvBjfcO8zjbfFytNRiaSHFmRmz10oy/+ghgBjMwqp67iwCN94QvSS0BrnMyoIibdrbJ9t4H3NNtU3ZTJFTqJKxeLDfqEnvzhAB21t4FYFYAf1eDLnJJlkFpT/HXlfqa9unWjF8IXtUHxpc4sqtaBzh1q9OR68qCvUr4W1xyWgmxR6a9TS8p7ch2ZY7WshOiqIpStV7KLcYZolucC1hWflmWpQReLI4hR4qIN/Sqy3dNA3I1LlNYK6sg7QVE2QQbvR2xl9LcFCLpxiU5oUEdkigrOlbp1GDdA8wbWL1zNwsRPC26Fa/Ed0wDNF4C3s1vjSTgFK25wPqzWrco2WmESLP6b+stI/HRtuP0uy/ZBFr2vdqPlwSB+Xy/WM+kc7Lj9PrVat5VG6MokfrFzQCqaBltyqx1coiQz9gamligJumFUB40RmtYoRwx1HC1Jp4/KoFYbbJuA/SNQKS0ENZSqBchTjqvwqJECahLLwuaiD8kDfqUXkTG64akmSGCw2u24kcNgVJGqWQHODaH++kKFntEVV1zhF/8BdRrCpbn8aRsAAAAASUVORK5CYII=",
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
                for (
                  let word = await line.getFirstWord();
                  await word.isValid();
                  word = await word.getNextWord()
                ) {
                  docTitle += (await word.getString()) + " ";
                }

                parsedData.title = docTitle;

                line = await line.getNextLine();

                let key = "";
                let value = "";

                for (; await line.isValid(); line = await line.getNextLine()) {
                  /* first word stats */
                  let word = await line.getFirstWord();
                  let wordStyle = await word.getStyle();
                  let wordSize = await wordStyle.getFontSize();
                  wordSize = parseInt(wordSize);

                  /* next first word stats */
                  let nextFirstLine = await line.getNextLine();

                  if (await nextFirstLine.isValid()) {
                    let nextFirstWord = await nextFirstLine.getFirstWord();
                    let nextFirstWordStyle = await nextFirstWord.getStyle();
                    let nextFirstWordSize = await nextFirstWordStyle.getFontSize();
                    nextFirstWordSize = parseInt(nextFirstWordSize);

                    let ifHeading = await word.getString();
                    if (
                      wordSize == 12 ||
                      (ifHeading.includes(":") && !ifHeading.includes("{"))
                    ) {
                      for (
                        let word = await line.getFirstWord();
                        await word.isValid();
                        word = await word.getNextWord()
                      ) {
                        key += (await word.getString()) + " ";
                      }
                    } else if (wordSize != 12 && nextFirstWordSize != 12) {
                      for (
                        let word = await line.getFirstWord();
                        await word.isValid();
                        word = await word.getNextWord()
                      ) {
                        value += (await word.getString()) + " ";
                      }
                    } else if (wordSize != 12 && nextFirstWordSize == 12) {
                      for (
                        let word = await line.getFirstWord();
                        await word.isValid();
                        word = await word.getNextWord()
                      ) {
                        value += (await word.getString()) + " ";
                      }

                      key = key.replace(":", "");
                      key = key.trim();

                      parsedData[key] = value;
                      key = "";
                      value = "";
                    }
                  } else {
                    for (
                      let word = await line.getFirstWord();
                      await word.isValid();
                      word = await word.getNextWord()
                    ) {
                      value += (await word.getString()) + " ";
                    }

                    key = key.replace(":", "");
                    key = key.trim();

                    parsedData[key] = value;
                    key = "";
                    value = "";
                  }
                }

                /* add signatures in parsed data */
                let signs = localStorage.getItem("signs");
                if (signs) {
                  signs = JSON.parse(signs);
                  parsedData = { ...parsedData, ...signs };
                }
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
            onChange={(e) => localStorage.setItem("field", e.target.value)}
            style={{
              width: "100%",
            }}
          />

          <div
            style={{
              display: "contents",
              alignItems: "center",
              width: "100%",
            }}
          >
            <div
              style={{
                border: "2px solid red",
                width: "100%",
                height: 200,
                alignSelf: "center",
                marginTop: 10,
                marginBottom: 10,
              }}
            >
              <SignaturePad
                penColor="green"
                canvasProps={{
                  width: 440,
                  height: 200,
                  className: "sigCanvas",
                }}
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
