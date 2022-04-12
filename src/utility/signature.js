export const viewers = [
  {
    initialDoc: "/files/pdf-new.pdf",
    domElement: "leftPanel",
  },
  {
    initialDoc: "https://pdftron.s3.amazonaws.com/downloads/pl/report.docx",
    domElement: "rightPanel",
  },
];

export const CANVAS_PROPS = { width: 440, height: 200, className: "sigCanvas" };
export const WEBVIEWER_FILE_PATH = "/webviewer/lib";

export const getMinimumDifferenceInstance = (
  FIELD_INSTANCE_NAME,
  DIFFERENCE_KEY_NAME,
  cordinatesDifferenceInstances
) => {
  let minimumDifferenceInstance = {
    difference: 999,
    fieldName: "",
  };

  cordinatesDifferenceInstances.forEach((item) => {
    if (item.difference < minimumDifferenceInstance.difference) {
      minimumDifferenceInstance = item;
    }
  });

  localStorage.setItem(DIFFERENCE_KEY_NAME, minimumDifferenceInstance.key);
  localStorage.setItem(
    FIELD_INSTANCE_NAME,
    minimumDifferenceInstance.fieldName
  );
};

export const createSignAnnotations = async (
  text,
  pageText,
  doc,
  Annotations,
  signFieldCount,
  signCordinateInstance,
  annotationManager
) => {
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
      const widgetAnnot = new Annotations.SignatureWidgetAnnotation(formField, {
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
      });

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
};

export const loadDatePickers = async (
  instance,
  Annotations,
  annotationManager
) => {
  const doc = instance.Core.documentViewer.getDocument();
  const pageText = await doc.loadPageText(1);
  const startIndex = pageText.indexOf("CurrentDate");
  const endIndex = startIndex + "CurrentDate".length;

  const quadsForRectangle = await doc.getTextPosition(
    1,
    startIndex,
    endIndex + 1
  );

  /* create a form field */
  const flags = new Annotations.WidgetFlags();
  const formField = new Annotations.Forms.Field(`datePicker`, {
    type: "tx",
    flags,
  });

  const datePickerAnnotation = new Annotations.DatePickerWidgetAnnotation(
    formField
  );
  datePickerAnnotation.datePickerOptions = {
    isRTL: true, // reverse the calendar for right-to-left languages
    firstDay: 1, //first day of the week (0: Sunday, 1: Monday, etc)
    i18n: {
      previousMonth: "Previous Month",
      nextMonth: "Next Month",
      months: [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ],
      monthsShort: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      weekdays: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      weekdaysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      invalidDateTime: "Custom error message",
    }, // language defaults for month and weekday names
    yearRange: [1900, 2015], // number of years either side (e.g. 10) or array of upper/lower range
  };

  datePickerAnnotation.X = quadsForRectangle[0].x1 + 100;
  datePickerAnnotation.Y = quadsForRectangle[0].y1 - 58;
  datePickerAnnotation.Width = 150;
  datePickerAnnotation.Height = 100;
  datePickerAnnotation.font.size = 20;
  datePickerAnnotation.Id = "DatePicker_1";
  datePickerAnnotation.FillColor = new Annotations.Color(0, 255, 255);
  datePickerAnnotation.StrokeColor = new Annotations.Color(0, 0, 0);
  annotationManager.addAnnotation(datePickerAnnotation);
  annotationManager.redrawAnnotation(datePickerAnnotation);
  annotationManager.addAnnotation(datePickerAnnotation);
  annotationManager.drawAnnotationsFromList([datePickerAnnotation]);
};

export const loadSignAnnotations = async (
  instance,
  Annotations,
  annotationManager
) => {
  localStorage.removeItem("signs");

  const doc = instance.Core.documentViewer.getDocument();
  const pageText = await doc.loadPageText(1);
  let text = await doc.loadPageText(1);

  text = text.split("\n");
  let signCordinateInstance = {};
  let signFieldCount = 0;

  await createSignAnnotations(
    text,
    pageText,
    doc,
    Annotations,
    signFieldCount,
    signCordinateInstance,
    annotationManager
  );

  localStorage.setItem("AllSignObjects", JSON.stringify(signCordinateInstance));
};

export const signatureClicked = async (
  e,
  SIGN_OBJECTS_NAME,
  FIELD_INSTANCE_NAME,
  DIFFERENCE_KEY_NAME
) => {
  let getAllItems = localStorage.getItem(SIGN_OBJECTS_NAME);
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
  getMinimumDifferenceInstance(
    FIELD_INSTANCE_NAME,
    DIFFERENCE_KEY_NAME,
    cordinatesDifferenceInstances
  );
};

export const addPageToTheDocument = async (
  newDoc,
  signImg,
  searchTerm,
  SIGN_FIELD_NAME
) => {
  let newPdfDoc = await newDoc.getPDFDoc();
  if (newPdfDoc) {
    let newPdfDocPage = await newPdfDoc.getPage(1);
    if (newPdfDocPage) {
      try {
        // save sign in local
        let signs = localStorage.getItem(SIGN_FIELD_NAME);
        if (signs) {
          signs = JSON.parse(signs);
          signs[searchTerm] = signImg;
          localStorage.setItem("signs", JSON.stringify(signs));
        } else {
          let signingTerm = {};
          signingTerm[searchTerm] = signImg;
          localStorage.setItem("signs", JSON.stringify(signingTerm));
        }
      } catch (error) {
        console.log(error);
      }
    }
  }
};

export const removeSignatureAnnotation = (
  annotationManager,
  FIELD_INSTANCE_NAME
) => {
  const fieldManager = annotationManager.getFieldManager();
  const field = fieldManager.getField(
    localStorage.getItem(FIELD_INSTANCE_NAME)
  );
  annotationManager.deleteAnnotation(field.widgets);
};

export const writeWhiteBackgroundMethod = async (
  PDFNet,
  newDoc,
  signatureImg,
  quadsForRectangle,
  pageHeight
) => {
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
};

export const writeSignatureImageMethod = async (
  PDFNet,
  newDoc,
  Whiteimg,
  toast,
  documentViewer,
  annotationManager,
  FIELD_INSTANCE_NAME,
  SIGN_FIELD_NAME
) => {
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
    Whiteimg
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
    let allSignaturedIndexes = localStorage.getItem(SIGN_FIELD_NAME) || {};

    if (typeof allSignaturedIndexes === "string") {
      allSignaturedIndexes = JSON.parse(allSignaturedIndexes);
    }

    const indexExist = allSignaturedIndexes[localStorage.getItem("field")];

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
    await writeWhiteBackgroundMethod(
      PDFNet,
      newDoc,
      signatureImg,
      quadsForRectangle,
      pageHeight
    );

    /* remove signture annotation after sign */
    removeSignatureAnnotation(annotationManager, FIELD_INSTANCE_NAME);

    /* add the page to the document */
    await addPageToTheDocument(newDoc, signImg, searchTerm, SIGN_FIELD_NAME);
  }
};
