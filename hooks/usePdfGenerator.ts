import React, { useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Invoice } from '../types';

interface UsePdfGeneratorProps {
    invoiceRef: React.RefObject<HTMLElement | null>;
    invoice: Invoice;
    theme: 'light' | 'dark';
}

export const usePdfGenerator = ({ invoiceRef, invoice, theme }: UsePdfGeneratorProps) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const generatePdf = useCallback(async (action: 'download' | 'preview' = 'download') => {
        if (!invoiceRef.current) return;
        setIsGenerating(true);

        try {
            const invoiceElement = invoiceRef.current;

            // Blur any active element to remove focus rings
            const activeElement = document.activeElement as HTMLElement;
            if (activeElement) {
                activeElement.blur();
            }

            // Wait for state updates and re-renders
            await new Promise(resolve => setTimeout(resolve, 500));

            const canvas = await html2canvas(invoiceElement, {
                scale: 2, // Higher scale for better resolution
                useCORS: true,
                backgroundColor: theme === 'light' ? '#ffffff' : '#09090b',
                logging: false,
                width: invoiceElement.scrollWidth,
                height: invoiceElement.scrollHeight,
                windowWidth: invoiceElement.scrollWidth,
                windowHeight: invoiceElement.scrollHeight,
            });

            const imgData = canvas.toDataURL('image/png');

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;

            const canvasAspectRatio = canvasWidth / canvasHeight;
            const pageAspectRatio = pdfWidth / pdfHeight;

            let renderWidth = pdfWidth;
            let renderHeight = pdfHeight;
            let xOffset = 0;
            let yOffset = 0;

            // Fit image to page while maintaining aspect ratio
            if (canvasAspectRatio > pageAspectRatio) {
                renderHeight = pdfWidth / canvasAspectRatio;
                yOffset = (pdfHeight - renderHeight) / 2;
            } else {
                renderWidth = pdfHeight * canvasAspectRatio;
                xOffset = (pdfWidth - renderWidth) / 2;
            }

            pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight);

            if (action === 'download') {
                pdf.save(`invoice-${invoice.number || 'download'}.pdf`);
            } else {
                const pdfBlobUrl = pdf.output('bloburl');
                setPreviewUrl(pdfBlobUrl);
                setIsPreviewOpen(true);
            }
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    }, [invoiceRef, invoice, theme]);

    return {
        generatePdf,
        isGenerating,
        previewUrl,
        isPreviewOpen,
        setIsPreviewOpen
    };
};
