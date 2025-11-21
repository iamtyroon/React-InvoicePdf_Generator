import React from 'react';
import { XIcon, DownloadIcon } from './icons';

interface PDFPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfUrl: string | null;
}

const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({ isOpen, onClose, pdfUrl }) => {
    if (!isOpen || !pdfUrl) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card w-full max-w-4xl h-[90vh] rounded-lg shadow-xl flex flex-col border border-border animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-card-foreground">Invoice Preview</h2>
                    <div className="flex gap-2">
                        <a 
                            href={pdfUrl} 
                            download="invoice.pdf" 
                            className="px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            Download
                        </a>
                        <button 
                            onClick={onClose}
                            className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 bg-muted/50 p-4 overflow-hidden">
                    <iframe 
                        src={pdfUrl} 
                        className="w-full h-full rounded-md border border-border bg-white" 
                        title="PDF Preview"
                    />
                </div>
            </div>
        </div>
    );
};

export default PDFPreviewModal;
