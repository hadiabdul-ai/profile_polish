document.addEventListener('DOMContentLoaded', function() {
    const profileForm = document.getElementById('profileForm');
    const submitButton = document.getElementById('submitButton');
    const spinner = document.getElementById('spinner');
    const progressPercentage = document.getElementById('progressPercentage');
    const bioInput = document.getElementById('bioInput');
    const fileInput = document.getElementById('fileInput');

    fileInput.addEventListener('change', function() {
        const files = Array.from(fileInput.files).map(file => file.name).join(', ');
        document.querySelector('.custom-file-label').textContent = files;
    });

    profileForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const bioInputValue = bioInput.value;
        const formData = new FormData();

        for (let file of fileInput.files) {
            try {
                const base64_compressed = await compressAndConvertToBase64(file);
                formData.append('images', base64_compressed);
            } catch (error) {
                console.error('Error processing file:', file, error);
            }
        }

        formData.append('bio', bioInputValue);

        // Show spinner, hide submit button, and start progress bar animation
        submitButton.style.display = 'none';
        spinner.style.display = 'flex';
        progressPercentage.innerText = '0%';

        let progress = 0;
        const interval = setInterval(() => {
            progress += 1;
            progressPercentage.innerText = `${progress}%`;
            if (progress >= 100) {
                clearInterval(interval);
            }
        }, 100); // 100ms * 100 = 10s

        try {
            const response = await fetch('https://ymstlg2yd9.execute-api.us-east-1.amazonaws.com/prod/analyze', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const responseData = await response.json();
            console.log("Response Data:", responseData);

            // Hide spinner
            spinner.style.display = 'none';

            // Open the feedback modal
            $('#feedbackModal').modal('show');

            // Display the feedback
            const convertedHTML = convertMarkdownToHTML(responseData.feedback);
            document.getElementById('feedback').innerHTML = convertedHTML;

        } catch (error) {
            console.error("Fetch error:", error);
            spinner.style.display = 'none';
            submitButton.style.display = 'block';
        }
    });

    // Show the submit button when the modal is closed
    $('#feedbackModal').on('hidden.bs.modal', function() {
        submitButton.style.display = 'block';
    });

    // Function to convert an image file to a compressed base64 string
    async function compressAndConvertToBase64(file, maxWidth = 500, maxHeight = 500, maxFileSizeKB = 100) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = function(event) {
                const img = new Image();
                img.src = event.target.result;
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Calculate the scaling factor to maintain aspect ratio
                    const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
                    const width = img.width * scale;
                    const height = img.height * scale;

                    // Set canvas dimensions to the scaled dimensions
                    canvas.width = width;
                    canvas.height = height;

                    // Draw the scaled image on the canvas
                    ctx.drawImage(img, 0, 0, width, height);

                    let quality = 0.7;
                    let compressedBase64 = canvas.toDataURL('image/jpeg', quality);

                    // Adjust quality to ensure the size is below the specified maxFileSizeKB
                    while (compressedBase64.length > maxFileSizeKB * 1024 && quality > 0.1) {
                        quality -= 0.1;
                        compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                    }

                    // Resolve the promise with the base64 string
                    resolve(compressedBase64);
                };
                img.onerror = function(error) {
                    reject(error);
                };
            };
            reader.onerror = function(error) {
                reject(error);
            };
        });
    }

    function convertMarkdownToHTML(text) {
        // Replace #### Heading with <h3>Heading</h3>
        text = text.replace(/####\s*(.*?)\n/g, '<h3>$1</h3>\n');

        // Replace ### Heading with <h3>Heading</h3>
        text = text.replace(/###\s*(.*?)\n/g, '<h3>$1</h3>\n');

        // Replace ## Heading with <h2>Heading</h2>
        text = text.replace(/##\s*(.*?)\n/g, '<h2>$1</h2>\n');

        // Replace **bold** with <strong>bold</strong>
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Replace newline characters with <br> tags
        text = text.replace(/\n/g, '');

        // Return the converted text
        return text;
    }

    // Submit form when Enter key is pressed in the bio textarea
    bioInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            submitButton.click();
        }
    });
});
