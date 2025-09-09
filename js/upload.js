document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input');
  const submitBtn = document.getElementById('submit-btn');
  const skipBtn = document.getElementById('skip-btn');
  const closeBtn = document.querySelector('.close');

  document.querySelector('.drop-area').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    submitBtn.disabled = fileInput.files.length === 0;
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
      const text = await extractText(file);
      const questions = parseQA(text);
      localStorage.setItem('uploadedQuestions', JSON.stringify(questions));
      window.location.href = 'create.html';
    } catch (err) {
      console.error('Failed to parse file', err);
      alert('Unable to parse file.');
    }
  });

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
    } else {
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }
  }

  function parseQA(text) {
    const lines = text.split(/\r?\n/);
    const out = [];
    let current = null;
    lines.forEach(line => {
      const q = line.match(/^(?:Q\d*[:.\-]|Question\s*\d*[:.\-])\s*(.+)/i);
      const a = line.match(/^(?:A\d*[:.\-]|Answer\s*\d*[:.\-])\s*(.+)/i);
      if (q) {
        current = { question: q[1].trim(), answer: '' };
        out.push(current);
      } else if (a && current) {
        current.answer = a[1].trim();
      }
    });
    return out;
  }
});
