exports.parse = (multipartBuffer, boundary) => {

  let process = file => {
    let headers     = file.header.split(';');
    let fileHeader  = headers[2].split('=');
    let filename    = JSON.parse(fileHeader[1].trim());
    let contentType = file.info.split(':')[1].trim();
    let data        = new Buffer(file.part);

    return {
      data:     data,
      filename: filename,
      type:     contentType
    };
  };

  let lastline = '';
  let header   = '';
  let info     = '';
  let state    = 0;
  let buffer   = [];
  let files    = [];

  for (let i = 0; i < multipartBuffer.length; i++) {
    let currByte        = multipartBuffer[i];
    let prevByte        = i > 0 ? multipartBuffer[i - 1] : null;
    let newLineDetected = (currByte === 0x0a) && (prevByte === 0x0d);
    let newLineChar     = (currByte === 0x0a) || (currByte === 0x0d);

    if (!newLineChar) {
      lastline += String.fromCharCode(currByte);
    }

    if ((0 === state) && newLineDetected) {
      if (`--${boundary}` === lastline) {
        state = 1;
      }
      lastline = '';
    } else if ((1 === state) && newLineDetected) {
      header   = lastline;
      lastline = '';
      state    = 2;
    } else if ((2 === state) && newLineDetected) {
      info     = lastline;
      lastline = '';
      state    = 3;
    } else if ((3 === state) && newLineDetected) {
      buffer   = [];
      lastline = '';
      state    = 4;
    } else if (4 === state) {
      if (lastline.length > (boundary.length + 4)) {
        lastline = '';
      }

      if (`--${boundary}` === lastline) {
        let j = buffer.length - lastline.length;
        let part = buffer.slice(0, j - 1);

        files.push(process({
          header: header,
          info:   info,
          part:   part
        }));

        buffer   = [];
        header   = '';
        info     = '';
        lastline = '';
        state    = 5;
      } else {
        buffer.push(currByte);
      }
      if (newLineDetected) {
        lastline = '';
      }
    } else if (5 === state && newLineDetected) {
      state = 1;
    }
  }
  return files;
};

exports.getBoundary = header => header.split('; boundary=')[1];
