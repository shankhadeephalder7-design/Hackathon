const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const dropzoneLabel = document.getElementById('dropzone-label');
const spinner = document.getElementById('spinner');
const statusText = document.getElementById('status-text');

dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  if (e.dataTransfer.files.length) {
    fileInput.files = e.dataTransfer.files;
    handleFile(fileInput.files[0]);
  }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length) handleFile(fileInput.files[0]);
});

async function handleFile(file) {
  dropzoneLabel.textContent = file.name;
  spinner.classList.add('show');
  statusText.textContent = 'Verifying your resume...';

  const formData = new FormData();
  formData.append('resume', file);

  try {
    const res = await fetch('/api/resume/analyze', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (!res.ok) {
      statusText.textContent = data.error || 'Something went wrong.';
      spinner.classList.remove('show');
      return;
    }

    statusText.textContent = 'Finding your matches...';

    // Store the extracted resume text for the next page to use
    sessionStorage.setItem('resumeText', data.resumeText);
    sessionStorage.setItem('atsScore', JSON.stringify(data.ats));

    setTimeout(() => {
      window.location.href = 'matches.html';
    }, 1200);

  } catch (err) {
    statusText.textContent = 'Could not reach the server.';
    spinner.classList.remove('show');
  }
}