document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input');
  const submitBtn = document.getElementById('submit-btn');
  const skipBtn = document.getElementById('skip-btn');
  const closeBtn = document.querySelector('.close');
  const dropArea = document.querySelector('.drop-area');
  const preview = document.getElementById('preview');
  let cachedText = '';

  dropArea.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', handleFile);

  dropArea.addEventListener('dragover', e => {
    e.preventDefault();
    dropArea.classList.add('dragover');
  });

  dropArea.addEventListener('dragleave', () => dropArea.classList.remove('dragover'));

  dropArea.addEventListener('drop', e => {
    e.preventDefault();
    dropArea.classList.remove('dragover');
    fileInput.files = e.dataTransfer.files;
    handleFile();
  });

  skipBtn.addEventListener('click', () => {
    window.location.href = 'create.html';
  });

  closeBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = fileInput.files[0];
    if (!file) return;
    try {
      if (!cachedText) {
        cachedText = await extractText(file);
      }
      const questions = parseQA(cachedText);
      localStorage.setItem('uploadedQuestions', JSON.stringify(questions));
      alert(`Imported ${questions.length} questions.`);
      window.location.href = 'create.html';
    } catch (err) {
      console.error('Failed to parse file', err);
      alert('Unable to parse file.');
    }
  });

  async function handleFile() {
    const file = fileInput.files[0];
    submitBtn.disabled = !file;
    cachedText = '';
    if (!file) {
      preview.classList.add('hidden');
      preview.textContent = '';
      return;
    }
    preview.classList.remove('hidden');
    preview.textContent = `Reading ${file.name}...`;
    try {
      cachedText = await extractText(file);
      preview.textContent = cachedText.slice(0, 200) + (cachedText.length > 200 ? '...' : '');
    } catch (err) {
      console.error('Preview failed', err);
      preview.textContent = 'Unable to preview file.';
      submitBtn.disabled = true;
    }
  }

  async function extractText(file) {
    const arrayBuffer = await file.arrayBuffer();
    if (file.type === 'application/pdf') {
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + '\n';
      }
      return text;
    } else if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
      return new TextDecoder().decode(arrayBuffer);
    } else {
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }
  }

  function parseQA(text) {
    const blocks = text.split(/\n{2,}/);
    const out = [];
    blocks.forEach(block => {
      const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (!lines.length) return;
      const qLines = [];
      const aLines = [];
      let collectingQuestion = true;
      lines.forEach(line => {
        const q = line.match(/^(?:Q\d*|Question\s*\d*)[:.\-\)]\s*(.+)/i);
        const a = line.match(/^(?:A\d*|Answer\s*\d*)[:.\-\)]\s*(.+)/i);
        if (q) {
          qLines.push(q[1].trim());
          collectingQuestion = false;
        } else if (a) {
          aLines.push(a[1].trim());
          collectingQuestion = false;
        } else if (collectingQuestion) {
          qLines.push(line);
          if (/[?]$/.test(line)) collectingQuestion = false;
        } else {
          aLines.push(line);
        }
      });
      const question = qLines.join(' ').trim();
      const answer = aLines.join(' ').trim();
      if (question && answer) out.push({ question, answer });
    });
    return out;
  }
});
