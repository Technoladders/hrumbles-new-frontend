// src/integrations/pdf-setup.ts

import * as pdfjsLib from 'pdfjs-dist';

// This line sets the worker source for the entire application.
// Vite serves files from the /public directory at the root URL path.
pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;