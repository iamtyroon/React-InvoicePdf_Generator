
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import type { Invoice, InvoiceItem } from './types';
import { COLORS, CURRENCIES, DEFAULT_INVOICE } from './constants';
import { PlusIcon, XIcon, CheckIcon, ImageIcon, DownloadIcon, MailIcon, SunIcon, MoonIcon, FolderPlusIcon, FolderIcon, SparklesIcon } from './components/icons';

declare var jspdf: any;
declare var html2canvas: any;

interface SavedInvoice {
  id: string;
  savedAt: string;
  invoice: Invoice;
}

const App: React.FC = () => {
    const [invoice, setInvoice] = useState<Invoice>(DEFAULT_INVOICE);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [drafts, setDrafts] = useState<SavedInvoice[]>([]);
    const invoiceRef = useRef<HTMLDivElement>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined' && localStorage.getItem('theme')) {
            return localStorage.getItem('theme') as 'light' | 'dark';
        }
        if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        try {
            const savedDrafts = localStorage.getItem('invoice-drafts');
            if (savedDrafts) {
                setDrafts(JSON.parse(savedDrafts));
            }
        } catch (error) {
            console.error("Failed to load drafts from local storage:", error);
            localStorage.removeItem('invoice-drafts');
        }
    }, []);

    const handleAiGenerate = useCallback(async (prompt: string): Promise<void> => {
        if (!prompt) return;

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        
        const systemInstruction = "You are an expert invoice processing AI. Your task is to analyze the user's request and extract all relevant information to create a complete invoice. Populate the fields based on the user's input and return the data in the specified JSON format. For any missing fields, use empty strings or sensible defaults (like 1 for quantity if not specified). Ensure the date is in 'YYYY-MM-DD' format.";

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                from: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, email: { type: Type.STRING }, address: { type: Type.STRING }, phone: { type: Type.STRING }, businessNumber: { type: Type.STRING }}},
                to: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, email: { type: Type.STRING }, address: { type: Type.STRING }, phone: { type: Type.STRING }, mobile: { type: Type.STRING }, fax: { type: Type.STRING }}},
                number: { type: Type.STRING },
                date: { type: Type.STRING, description: "Use YYYY-MM-DD format." },
                terms: { type: Type.STRING },
                items: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            description: { type: Type.STRING },
                            details: { type: Type.STRING },
                            quantity: { type: Type.NUMBER },
                            rate: { type: Type.NUMBER },
                        },
                        required: ['description', 'quantity', 'rate'],
                    },
                },
            },
        };

        const fullPrompt = `${systemInstruction}\n\nUser request: "${prompt}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonText = response.text;
        const parsedData = JSON.parse(jsonText);

        setInvoice(prev => ({
            ...prev,
            ...parsedData,
            from: { ...prev.from, ...parsedData.from },
            to: { ...prev.to, ...parsedData.to },
            items: parsedData.items ? parsedData.items.map((item: Omit<InvoiceItem, 'id'>) => ({
                ...item,
                id: crypto.randomUUID(),
            })) : prev.items,
        }));
    }, []);

    const saveDraftsToLocalStorage = (newDrafts: SavedInvoice[]) => {
        try {
            localStorage.setItem('invoice-drafts', JSON.stringify(newDrafts));
        } catch (error) {
            console.error("Failed to save drafts to local storage:", error);
        }
    };

    const handleSaveDraft = useCallback(() => {
        const newDraft: SavedInvoice = {
            id: crypto.randomUUID(),
            savedAt: new Date().toISOString(),
            invoice: invoice,
        };
        const updatedDrafts = [newDraft, ...drafts];
        setDrafts(updatedDrafts);
        saveDraftsToLocalStorage(updatedDrafts);
        alert('Draft saved successfully!');
    }, [invoice, drafts]);

    const handleLoadDraft = useCallback((draftId: string) => {
        const draftToLoad = drafts.find(d => d.id === draftId);
        if (draftToLoad) {
            setInvoice(draftToLoad.invoice);
        }
    }, [drafts]);

    const handleDeleteDraft = useCallback((draftId: string) => {
        if(window.confirm('Are you sure you want to delete this draft?')) {
            const updatedDrafts = drafts.filter(d => d.id !== draftId);
            setDrafts(updatedDrafts);
            saveDraftsToLocalStorage(updatedDrafts);
        }
    }, [drafts]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    const handleInputChange = useCallback(<T extends keyof Invoice>(field: T, value: Invoice[T]) => {
        setInvoice(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleBusinessChange = useCallback((field: string, value: string) => {
        setInvoice(prev => ({ ...prev, from: { ...prev.from, [field]: value } }));
    }, []);

    const handleClientChange = useCallback((field: string, value: string) => {
        setInvoice(prev => ({ ...prev, to: { ...prev.to, [field]: value } }));
    }, []);

    const handleBankDetailsChange = useCallback((field: string, value: string) => {
        setInvoice(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, [field]: value } }));
    }, []);

    const handleItemChange = useCallback((id: string, field: keyof InvoiceItem, value: string | number) => {
        setInvoice(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            ),
        }));
    }, []);

    const handleAddItem = useCallback(() => {
        setInvoice(prev => ({
            ...prev,
            items: [...prev.items, { id: crypto.randomUUID(), description: '', details: '', quantity: 1, rate: 0 }],
        }));
    }, []);

    const handleRemoveItem = useCallback((id: string) => {
        setInvoice(prev => ({
            ...prev,
            items: prev.items.filter(item => item.id !== id),
        }));
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'signatureUrl') => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    handleInputChange(field, event.target.result as string);
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };
    
    const generatePdf = async () => {
        if (!invoiceRef.current) return;
        setIsGenerating(true);
        
        try {
            const { jsPDF } = jspdf;
            const invoiceElement = invoiceRef.current;
            
            const activeElement = document.activeElement as HTMLElement;
            if (activeElement) {
                activeElement.blur();
            }
    
            const canvas = await html2canvas(invoiceElement, {
                scale: 2,
                useCORS: true,
                backgroundColor: theme === 'light' ? '#ffffff' : '#09090b',
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
    
            if (canvasAspectRatio > pageAspectRatio) {
                renderHeight = pdfWidth / canvasAspectRatio;
                yOffset = (pdfHeight - renderHeight) / 2;
            } else {
                renderWidth = pdfHeight * canvasAspectRatio;
                xOffset = (pdfWidth - renderWidth) / 2;
            }
    
            pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight);
            pdf.save(`invoice-${invoice.number || 'download'}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const formatCurrency = useCallback((amount: number) => {
        return `${invoice.currency.symbol}${amount.toFixed(2)}`;
    }, [invoice.currency]);
    
    const subtotal = useMemo(() => invoice.items.reduce((acc, item) => acc + item.quantity * item.rate, 0), [invoice.items]);

    const total = useMemo(() => {
        let currentTotal = subtotal;
        if (invoice.taxType === 'percentage' && invoice.taxValue > 0) {
            currentTotal += subtotal * (invoice.taxValue / 100);
        } else if (invoice.taxType === 'fixed' && invoice.taxValue > 0) {
            currentTotal += invoice.taxValue;
        }

        if (invoice.discountType === 'percentage' && invoice.discountValue > 0) {
            currentTotal -= currentTotal * (invoice.discountValue / 100);
        } else if (invoice.discountType === 'fixed' && invoice.discountValue > 0) {
            currentTotal -= invoice.discountValue;
        }

        return currentTotal;
    }, [subtotal, invoice.taxType, invoice.taxValue, invoice.discountType, invoice.discountValue]);


    return (
        <div className="min-h-screen bg-background font-sans text-foreground">
            <Header 
                onGeneratePdf={generatePdf} 
                isGenerating={isGenerating} 
                theme={theme}
                toggleTheme={toggleTheme}
                onSaveDraft={handleSaveDraft}
                drafts={drafts}
                onLoadDraft={handleLoadDraft}
                onDeleteDraft={handleDeleteDraft}
                onOpenAiModal={() => setIsAiModalOpen(true)}
            />
            {isAiModalOpen && (
                <AiAssistantModal 
                    onClose={() => setIsAiModalOpen(false)}
                    onGenerate={handleAiGenerate}
                />
            )}
            <main className="container mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="lg:w-2/3">
                        <InvoiceForm 
                            ref={invoiceRef}
                            invoice={invoice} 
                            handleInputChange={handleInputChange} 
                            handleBusinessChange={handleBusinessChange} 
                            handleClientChange={handleClientChange}
                            handleBankDetailsChange={handleBankDetailsChange}
                            handleItemChange={handleItemChange} 
                            handleAddItem={handleAddItem}
                            handleRemoveItem={handleRemoveItem}
                            handleFileUpload={handleFileUpload}
                            formatCurrency={formatCurrency}
                            subtotal={subtotal}
                            total={total}
                        />
                    </div>
                    <div className="lg:w-1/3">
                        <Sidebar 
                            invoice={invoice} 
                            handleInputChange={handleInputChange} 
                        />
                    </div>
                </div>
            </main>
        </div>
    );
};

const Header: React.FC<{ 
    onGeneratePdf: () => void; 
    isGenerating: boolean;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    onSaveDraft: () => void;
    drafts: SavedInvoice[];
    onLoadDraft: (id: string) => void;
    onDeleteDraft: (id: string) => void;
    onOpenAiModal: () => void;
}> = ({ onGeneratePdf, isGenerating, theme, toggleTheme, onSaveDraft, drafts, onLoadDraft, onDeleteDraft, onOpenAiModal }) => (
    <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <h1 className="text-xl font-bold text-card-foreground">Invoice Generator</h1>
            <div className="flex items-center gap-2">
                 <button 
                    onClick={onOpenAiModal}
                    className="px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80"
                >
                    <SparklesIcon className="w-4 h-4" />
                    AI Assistant
                </button>
                <button 
                    onClick={onSaveDraft}
                    className="px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80"
                >
                    <FolderPlusIcon className="w-4 h-4" />
                    Save Draft
                </button>
                <DraftsDropdown drafts={drafts} onLoadDraft={onLoadDraft} onDeleteDraft={onDeleteDraft} />
                <button 
                  onClick={onGeneratePdf} 
                  disabled={isGenerating} 
                  className="px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed"
                >
                    <DownloadIcon className="w-4 h-4" />
                    {isGenerating ? 'Generating...' : 'Download PDF'}
                </button>
                <button className="px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80">
                    <MailIcon className="w-4 h-4" />
                    Email Invoice
                </button>
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-md transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    aria-label="Toggle theme"
                >
                    {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                </button>
            </div>
        </div>
    </header>
);

const AiAssistantModal: React.FC<{
    onClose: () => void;
    onGenerate: (prompt: string) => Promise<void>;
}> = ({ onClose, onGenerate }) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    const handleGenerateClick = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await onGenerate(prompt);
            onClose();
        } catch (err) {
            console.error(err);
            setError('Failed to generate invoice. Please check your prompt or try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center p-4">
            <div ref={modalRef} className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                    <XIcon className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-semibold text-card-foreground mb-4">AI Invoice Assistant</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    Describe the invoice you want to create. Include client name, items, quantities, and rates. The AI will fill out the form for you.
                </p>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., Invoice John Smith for 10 hours of consulting at $100/hr and a $50 project fee..."
                    className="w-full p-2 bg-input border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none h-32 resize-none"
                    disabled={isLoading}
                />
                {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                <div className="mt-4 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80" disabled={isLoading}>
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerateClick}
                        className="px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed"
                        disabled={isLoading || !prompt}
                    >
                        {isLoading ? 'Generating...' : 'Generate Invoice'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const DraftsDropdown: React.FC<{
    drafts: SavedInvoice[];
    onLoadDraft: (id: string) => void;
    onDeleteDraft: (id: string) => void;
}> = ({ drafts, onLoadDraft, onDeleteDraft }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
                <FolderIcon className="w-4 h-4" />
                Drafts <span className="bg-primary/20 text-primary rounded-full px-2 text-xs">{drafts.length}</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-30 max-h-96 overflow-y-auto">
                    {drafts.length > 0 ? (
                        <ul>
                            {drafts.map(draft => (
                                <li key={draft.id} className="border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors">
                                    <div className="flex justify-between items-center p-3">
                                        <button 
                                            onClick={() => { onLoadDraft(draft.id); setIsOpen(false); }} 
                                            className="text-left w-full cursor-pointer"
                                            aria-label={`Load draft for ${draft.invoice.to.name || 'Untitled Draft'}`}
                                        >
                                            <p className="font-semibold truncate text-card-foreground">{draft.invoice.to.name || `Invoice #${draft.invoice.number}` || 'Untitled Draft'}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(draft.savedAt).toLocaleString()}
                                            </p>
                                        </button>
                                        <button 
                                            onClick={() => onDeleteDraft(draft.id)} 
                                            className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10"
                                            aria-label={`Delete draft for ${draft.invoice.to.name || 'Untitled Draft'}`}
                                        >
                                            <XIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="p-4 text-center text-sm text-muted-foreground">No drafts saved.</p>
                    )}
                </div>
            )}
        </div>
    );
};


const Sidebar: React.FC<{ invoice: Invoice; handleInputChange: <T extends keyof Invoice>(field: T, value: Invoice[T]) => void; }> = ({ invoice, handleInputChange }) => {
    
    const handleCurrencyChange = (code: string) => {
        const newCurrency = CURRENCIES.find(c => c.code === code);
        if (newCurrency) {
            handleInputChange('currency', newCurrency);
        }
    };
    
    return (
        <aside className="space-y-6 sticky top-24">
            <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Color</h3>
                <div className="grid grid-cols-8 gap-2">
                    {COLORS.map(color => (
                        <button 
                            key={color} 
                            onClick={() => handleInputChange('color', color)} 
                            className="w-8 h-8 rounded-full border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-all relative flex items-center justify-center" 
                            style={{ backgroundColor: `hsl(${color})` }}
                            aria-label={`Set color to ${color}`}
                        >
                          {invoice.color === color && <CheckIcon className="w-5 h-5 text-white mix-blend-difference" />}
                        </button>
                    ))}
                </div>
            </div>
             <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Currency</h3>
                 <select
                    value={invoice.currency.code}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                    className="w-full p-2 bg-input border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none"
                >
                    {CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{`${c.flag} ${c.code} - ${c.name}`}</option>
                    ))}
                </select>
            </div>
        </aside>
    );
};


const InvoiceForm = React.forwardRef<HTMLDivElement, {
    invoice: Invoice;
    handleInputChange: <T extends keyof Invoice>(field: T, value: Invoice[T]) => void;
    handleBusinessChange: (field: string, value: string) => void;
    handleClientChange: (field: string, value: string) => void;
    handleBankDetailsChange: (field: string, value: string) => void;
    handleItemChange: (id: string, field: keyof InvoiceItem, value: string | number) => void;
    handleAddItem: () => void;
    handleRemoveItem: (id: string) => void;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'signatureUrl') => void;
    formatCurrency: (amount: number) => string;
    subtotal: number;
    total: number;
}>(({ invoice, handleInputChange, handleBusinessChange, handleClientChange, handleBankDetailsChange, handleItemChange, handleAddItem, handleRemoveItem, handleFileUpload, formatCurrency, subtotal, total }, ref) => {
    
    return (
        <div ref={ref} className="bg-card p-8 md:p-12 border border-border rounded-lg">
            <div className="flex justify-between items-start mb-12">
                <input
                    type="text"
                    value={invoice.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="text-4xl font-bold bg-transparent border-none p-0 focus:outline-none focus:ring-0 w-1/2 placeholder:text-muted-foreground/50"
                    placeholder="Invoice"
                    style={{color: `hsl(${invoice.color})`}}
                />
                <ImageUploader url={invoice.logoUrl} onChange={e => handleFileUpload(e, 'logoUrl')}>
                    <div className="text-center">
                        <ImageIcon className="mx-auto w-8 h-8" />
                        <span className="mt-1 block text-sm">+ Add Logo</span>
                    </div>
                </ImageUploader>
            </div>

            <div className="grid md:grid-cols-2 gap-12 mb-12">
                <div>
                    <h3 className="text-lg font-semibold mb-4 text-muted-foreground border-b border-border pb-2">From</h3>
                    <div className="space-y-3">
                        <EditableField placeholder="Business Name" value={invoice.from.name} onChange={e => handleBusinessChange('name', e.target.value)} className="font-semibold" />
                        <EditableField placeholder="Email" type="email" value={invoice.from.email} onChange={e => handleBusinessChange('email', e.target.value)} />
                        <EditableField placeholder="Address" value={invoice.from.address} onChange={e => handleBusinessChange('address', e.target.value)} />
                        <EditableField placeholder="Phone" type="tel" value={invoice.from.phone} onChange={e => handleBusinessChange('phone', e.target.value)} />
                        <EditableField placeholder="Business Number" value={invoice.from.businessNumber} onChange={e => handleBusinessChange('businessNumber', e.target.value)} />
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-4 text-muted-foreground border-b border-border pb-2">Bill To</h3>
                    <div className="space-y-3">
                        <EditableField placeholder="Client Name" value={invoice.to.name} onChange={e => handleClientChange('name', e.target.value)} className="font-semibold" />
                        <EditableField placeholder="Email" type="email" value={invoice.to.email} onChange={e => handleClientChange('email', e.target.value)} />
                        <EditableField placeholder="Address" value={invoice.to.address} onChange={e => handleClientChange('address', e.target.value)} />
                        <EditableField placeholder="Phone" type="tel" value={invoice.to.phone} onChange={e => handleClientChange('phone', e.target.value)} />
                        <EditableField placeholder="Mobile" type="tel" value={invoice.to.mobile} onChange={e => handleClientChange('mobile', e.target.value)} />
                        <EditableField placeholder="Fax" type="tel" value={invoice.to.fax} onChange={e => handleClientChange('fax', e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
                <InputField label="Number" value={invoice.number} onChange={e => handleInputChange('number', e.target.value)} />
                <InputField label="Date" type="date" value={invoice.date} onChange={e => handleInputChange('date', e.target.value)} />
                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Terms</label>
                    <select value={invoice.terms} onChange={e => handleInputChange('terms', e.target.value)} className="w-full p-2 bg-input border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none">
                        <option>On Receipt</option>
                        <option>Net 15</option>
                        <option>Net 30</option>
                        <option>Net 60</option>
                    </select>
                </div>
            </div>

            <div className="mb-12">
                <div className="grid grid-cols-[3fr_1fr_1fr_1fr_24px] gap-4 text-sm font-semibold text-muted-foreground uppercase py-2 border-b-2 border-border">
                    <div>Description</div>
                    <div className="text-right">Rate</div>
                    <div className="text-right">Qty</div>
                    <div className="text-right">Amount</div>
                    <div></div>
                </div>
                {invoice.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-[3fr_1fr_1fr_1fr_24px] gap-4 items-start py-4 border-b border-border group">
                        <div>
                            <EditableField placeholder="Item Description" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} className="font-medium" />
                            <textarea placeholder="Additional details..." value={item.details} onChange={e => handleItemChange(item.id, 'details', e.target.value)} className="w-full p-1 mt-1 text-sm text-muted-foreground bg-secondary/50 border border-transparent rounded-md h-16 focus:outline-none focus:border-border focus:bg-input" />
                        </div>
                        <div>
                             <EditableField type="number" step="0.01" value={item.rate} onChange={e => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)} className="text-right" />
                        </div>
                        <div>
                            <EditableField type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)} className="text-right" />
                        </div>
                        <div className="text-right py-1 text-foreground font-medium">
                            {formatCurrency(item.rate * item.quantity)}
                        </div>
                        <div className="flex items-center justify-center pt-1">
                            <button onClick={() => handleRemoveItem(item.id)} className="text-muted-foreground hover:text-destructive opacity-50 group-hover:opacity-100 transition-opacity" aria-label="Remove item">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
                <button onClick={handleAddItem} className="mt-4 px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1 transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80">
                    <PlusIcon className="w-4 h-4" /> Add Item
                </button>
            </div>
            
            <div className="flex justify-end mb-10">
                <div className="w-full md:w-1/2 lg:w-2/5 space-y-3">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-bold text-lg" style={{ color: `hsl(${invoice.color})` }}>{formatCurrency(total)}</span>
                    </div>
                    <div className="flex justify-between border-t-2 border-border pt-3 mt-3">
                        <span className="font-semibold text-card-foreground">Balance Due</span>
                        <span className="font-semibold text-card-foreground">{formatCurrency(total)}</span>
                    </div>
                </div>
            </div>

            <div className="space-y-12">
                <div>
                    <h3 className="text-lg font-semibold text-muted-foreground mb-2">Bank Details</h3>
                    <div className="space-y-3">
                       <EditableField placeholder="Bank Name" value={invoice.bankDetails.bankName} onChange={e => handleBankDetailsChange('bankName', e.target.value)} />
                       <EditableField placeholder="Bank City" value={invoice.bankDetails.bankCity} onChange={e => handleBankDetailsChange('bankCity', e.target.value)} />
                       <EditableField placeholder="Branch" value={invoice.bankDetails.branch} onChange={e => handleBankDetailsChange('branch', e.target.value)} />
                       <EditableField placeholder="Name On Card" value={invoice.bankDetails.cardName} onChange={e => handleBankDetailsChange('cardName', e.target.value)} />
                       <EditableField placeholder="Card No." value={invoice.bankDetails.cardNumber} onChange={e => handleBankDetailsChange('cardNumber', e.target.value)} />
                       <EditableField placeholder="Bank Swift Code" value={invoice.bankDetails.swiftCode} onChange={e => handleBankDetailsChange('swiftCode', e.target.value)} />
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-muted-foreground mb-2">Signature</h3>
                    <ImageUploader url={invoice.signatureUrl} onChange={e => handleFileUpload(e, 'signatureUrl')}>
                        <span className="flex items-center gap-2"><PlusIcon className="w-5 h-5"/> Add Signature</span>
                    </ImageUploader>
                </div>
            </div>
        </div>
    );
});

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

const InputField: React.FC<InputFieldProps> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
        <input 
            {...props} 
            className="w-full p-2 bg-input border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none" 
        />
    </div>
);

const EditableField: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
    <input 
        {...props} 
        className={`w-full bg-transparent border-b border-transparent hover:border-input/50 focus:border-primary focus:bg-input/50 focus:outline-none p-1 -m-1 rounded-sm transition-colors ${className}`}
    />
);

const ImageUploader: React.FC<{ url: string | null; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; children: React.ReactNode; }> = ({ url, onChange, children }) => (
    <div className="w-48 h-24 border border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground relative hover:bg-accent/50 cursor-pointer transition-colors">
        {url ? (
            <img src={url} alt="upload" className="max-w-full max-h-full object-contain" />
        ) : (
            children
        )}
        <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={onChange} />
    </div>
);

export default App;
