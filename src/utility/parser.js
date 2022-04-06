export const extractDataFromPDF = async (line, key, value, parsedData) => {
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
};

export const extractTitle = async (line, docTitle, parsedData) => {
  for (
    let word = await line.getFirstWord();
    await word.isValid();
    word = await word.getNextWord()
  ) {
    docTitle += (await word.getString()) + " ";
  }

  parsedData.title = docTitle;

  line = await line.getNextLine();
};
