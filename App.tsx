
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { Invoice, InvoiceItem } from './types';
import { COLORS, CURRENCIES, DEFAULT_INVOICE } from './constants';
import { PlusIcon, XIcon, CheckIcon, ImageIcon, DownloadIcon, MailIcon, SunIcon, MoonIcon, FolderPlusIcon, FolderIcon, EyeIcon } from './components/icons';
import PDFPreviewModal from './components/PDFPreviewModal';
import { usePdfGenerator } from './hooks/usePdfGenerator';

interface SavedInvoice {
    id: string;
    savedAt: string;
    invoice: Invoice;
}

const App: React.FC = () => {
    const [invoice, setInvoice] = useState<Invoice>(DEFAULT_INVOICE);
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

    const { generatePdf, isGenerating, previewUrl, isPreviewOpen, setIsPreviewOpen } = usePdfGenerator({
        invoiceRef,
        invoice,
        theme
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
        if (window.confirm('Are you sure you want to delete this draft?')) {
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


    const [isViewMode, setIsViewMode] = useState(false);

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
                isViewMode={isViewMode}
                setIsViewMode={setIsViewMode}
            />
            <PDFPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                pdfUrl={previewUrl}
            />
            <main className="container mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    <div className={isViewMode ? "w-full max-w-4xl mx-auto" : "lg:w-2/3"}>
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
                            isPreview={isGenerating || isViewMode}
                        />
                    </div>
                    {!isViewMode && (
                        <div className="lg:w-1/3">
                            <Sidebar
                                invoice={invoice}
                                handleInputChange={handleInputChange}
                            />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

const Header: React.FC<{
    onGeneratePdf: (action: 'download' | 'preview') => void;
    isGenerating: boolean;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    onSaveDraft: () => void;
    drafts: SavedInvoice[];
    onLoadDraft: (id: string) => void;
    onDeleteDraft: (id: string) => void;
    isViewMode: boolean;
    setIsViewMode: (value: boolean) => void;
}> = ({ onGeneratePdf, isGenerating, theme, toggleTheme, onSaveDraft, drafts, onLoadDraft, onDeleteDraft, isViewMode, setIsViewMode }) => (
    <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <h1 className="text-xl font-bold text-card-foreground">Invoice Generator</h1>
            <div className="flex items-center gap-2">
                <button
                    onClick={onSaveDraft}
                    className="px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80"
                >
                    <FolderPlusIcon className="w-4 h-4" />
                    Save Draft
                </button>
                <DraftsDropdown drafts={drafts} onLoadDraft={onLoadDraft} onDeleteDraft={onDeleteDraft} />
                <button
                    onClick={() => setIsViewMode(!isViewMode)}
                    className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${isViewMode ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                >
                    <EyeIcon className="w-4 h-4" />
                    {isViewMode ? 'Edit Invoice' : 'Preview'}
                </button>
                <button
                    onClick={() => onGeneratePdf('download')}
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
    isPreview: boolean;
}>(({ invoice, handleInputChange, handleBusinessChange, handleClientChange, handleBankDetailsChange, handleItemChange, handleAddItem, handleRemoveItem, handleFileUpload, formatCurrency, subtotal, total, isPreview }, ref) => {

    return (
        <div ref={ref} className="bg-card p-8 md:p-12 border border-border rounded-lg">
            <div className="flex justify-between items-start mb-12">
                {isPreview ? (
                    <h1 className="text-4xl font-bold p-0 w-1/2" style={{ color: `hsl(${invoice.color})` }}>
                        {invoice.title || 'Invoice'}
                    </h1>
                ) : (
                    <input
                        type="text"
                        value={invoice.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className="text-4xl font-bold bg-transparent border-none p-0 focus:outline-none focus:ring-0 w-1/2 placeholder:text-muted-foreground/50"
                        placeholder="Invoice"
                        style={{ color: `hsl(${invoice.color})` }}
                    />
                )}
                {(!isPreview || invoice.logoUrl) && (
                    <ImageUploader url={invoice.logoUrl} onChange={e => handleFileUpload(e, 'logoUrl')}>
                        {!isPreview && (
                            <div className="text-center">
                                <ImageIcon className="mx-auto w-8 h-8" />
                                <span className="mt-1 block text-sm">+ Add Logo</span>
                            </div>
                        )}
                    </ImageUploader>
                )}
            </div>

            <div className="grid md:grid-cols-2 gap-12 mb-12">
                <div>
                    <h3 className="text-lg font-semibold mb-4 text-muted-foreground border-b border-border pb-2">From</h3>
                    <div className="space-y-3">
                        <EditableField isPreview={isPreview} placeholder="Business Name" value={invoice.from.name} onChange={e => handleBusinessChange('name', e.target.value)} className="font-semibold" />
                        <EditableField isPreview={isPreview} placeholder="Email" type="email" value={invoice.from.email} onChange={e => handleBusinessChange('email', e.target.value)} />
                        <EditableTextArea isPreview={isPreview} placeholder="Address" value={invoice.from.address} onChange={e => handleBusinessChange('address', e.target.value)} />
                        <EditableField isPreview={isPreview} placeholder="Phone" type="tel" value={invoice.from.phone} onChange={e => handleBusinessChange('phone', e.target.value)} />
                        {(!isPreview || invoice.from.businessNumber) && <EditableField isPreview={isPreview} placeholder="Business Number" value={invoice.from.businessNumber} onChange={e => handleBusinessChange('businessNumber', e.target.value)} />}
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-4 text-muted-foreground border-b border-border pb-2">Bill To</h3>
                    <div className="space-y-3">
                        <EditableField isPreview={isPreview} placeholder="Client Name" value={invoice.to.name} onChange={e => handleClientChange('name', e.target.value)} className="font-semibold" />
                        <EditableField isPreview={isPreview} placeholder="Email" type="email" value={invoice.to.email} onChange={e => handleClientChange('email', e.target.value)} />
                        <EditableTextArea isPreview={isPreview} placeholder="Address" value={invoice.to.address} onChange={e => handleClientChange('address', e.target.value)} />
                        <EditableField isPreview={isPreview} placeholder="Phone" type="tel" value={invoice.to.phone} onChange={e => handleClientChange('phone', e.target.value)} />
                        {(!isPreview || invoice.to.mobile) && <EditableField isPreview={isPreview} placeholder="Mobile" type="tel" value={invoice.to.mobile} onChange={e => handleClientChange('mobile', e.target.value)} />}
                        {(!isPreview || invoice.to.fax) && <EditableField isPreview={isPreview} placeholder="Fax" type="tel" value={invoice.to.fax} onChange={e => handleClientChange('fax', e.target.value)} />}
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
                <InputField isPreview={isPreview} label="Number" value={invoice.number} onChange={e => handleInputChange('number', e.target.value)} />
                <InputField isPreview={isPreview} label="Date" type="date" value={invoice.date} onChange={e => handleInputChange('date', e.target.value)} />
                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Terms</label>
                    {isPreview ? (
                        <div className="p-2 font-medium">{invoice.terms}</div>
                    ) : (
                        <select value={invoice.terms} onChange={e => handleInputChange('terms', e.target.value)} className="w-full p-2 bg-input border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none">
                            <option>On Receipt</option>
                            <option>Net 15</option>
                            <option>Net 30</option>
                            <option>Net 60</option>
                        </select>
                    )}
                </div>
            </div>

            <div className="mb-12">
                <div className={`grid gap-4 text-sm font-semibold text-muted-foreground uppercase py-2 border-b-2 border-border ${isPreview ? 'grid-cols-[3fr_1fr_1fr_1fr]' : 'grid-cols-[3fr_1fr_1fr_1fr_24px]'}`}>
                    <div>Description</div>
                    <div className="text-right">Rate</div>
                    <div className="text-right">Qty</div>
                    <div className="text-right">Amount</div>
                    {!isPreview && <div></div>}
                </div>
                {invoice.items.map((item) => (
                    <div key={item.id} className={`grid gap-4 items-start py-4 border-b border-border group ${isPreview ? 'grid-cols-[3fr_1fr_1fr_1fr]' : 'grid-cols-[3fr_1fr_1fr_1fr_24px]'}`}>
                        <div>
                            <EditableField isPreview={isPreview} placeholder="Item Description" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} className="font-medium" />
                            <EditableTextArea isPreview={isPreview} placeholder="Additional details..." value={item.details} onChange={e => handleItemChange(item.id, 'details', e.target.value)} className={isPreview ? "w-full mt-1 text-sm text-muted-foreground" : "w-full p-1 mt-1 text-sm text-muted-foreground bg-secondary/50 border border-transparent rounded-md h-16 focus:outline-none focus:border-border focus:bg-input"} />
                        </div>
                        <div>
                            <EditableField isPreview={isPreview} type="number" step="0.01" value={item.rate} onChange={e => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)} className="text-right" />
                        </div>
                        <div>
                            <EditableField isPreview={isPreview} type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)} className="text-right" />
                        </div>
                        <div className="text-right py-1 text-foreground font-medium">
                            {formatCurrency(item.rate * item.quantity)}
                        </div>
                        {!isPreview && (
                            <div className="flex items-center justify-center pt-1">
                                <button onClick={() => handleRemoveItem(item.id)} className="text-muted-foreground hover:text-destructive opacity-50 group-hover:opacity-100 transition-opacity" aria-label="Remove item">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                {!isPreview && (
                    <button onClick={handleAddItem} className="mt-4 px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1 transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80">
                        <PlusIcon className="w-4 h-4" /> Add Item
                    </button>
                )}
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
                {(!isPreview || invoice.bankDetails.bankName || invoice.bankDetails.bankCity || invoice.bankDetails.branch || invoice.bankDetails.cardName || invoice.bankDetails.cardNumber || invoice.bankDetails.swiftCode) && (
                    <div>
                        <h3 className="text-lg font-semibold text-muted-foreground mb-2">Bank Details</h3>
                        <div className="space-y-3">
                            {(!isPreview || invoice.bankDetails.bankName) && <EditableField isPreview={isPreview} placeholder="Bank Name" value={invoice.bankDetails.bankName} onChange={e => handleBankDetailsChange('bankName', e.target.value)} />}
                            {(!isPreview || invoice.bankDetails.bankCity) && <EditableField isPreview={isPreview} placeholder="Bank City" value={invoice.bankDetails.bankCity} onChange={e => handleBankDetailsChange('bankCity', e.target.value)} />}
                            {(!isPreview || invoice.bankDetails.branch) && <EditableField isPreview={isPreview} placeholder="Branch" value={invoice.bankDetails.branch} onChange={e => handleBankDetailsChange('branch', e.target.value)} />}
                            {(!isPreview || invoice.bankDetails.cardName) && <EditableField isPreview={isPreview} placeholder="Name On Card" value={invoice.bankDetails.cardName} onChange={e => handleBankDetailsChange('cardName', e.target.value)} />}
                            {(!isPreview || invoice.bankDetails.cardNumber) && <EditableField isPreview={isPreview} placeholder="Card No." value={invoice.bankDetails.cardNumber} onChange={e => handleBankDetailsChange('cardNumber', e.target.value)} />}
                            {(!isPreview || invoice.bankDetails.swiftCode) && <EditableField isPreview={isPreview} placeholder="Bank Swift Code" value={invoice.bankDetails.swiftCode} onChange={e => handleBankDetailsChange('swiftCode', e.target.value)} />}
                        </div>
                    </div>
                )}
                {(!isPreview || invoice.signatureUrl) && (
                    <div>
                        <h3 className="text-lg font-semibold text-muted-foreground mb-2">Signature</h3>
                        <ImageUploader url={invoice.signatureUrl} onChange={e => handleFileUpload(e, 'signatureUrl')}>
                            {!isPreview && <span className="flex items-center gap-2"><PlusIcon className="w-5 h-5" /> Add Signature</span>}
                        </ImageUploader>
                    </div>
                )}
            </div>
        </div>
    );
});

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    isPreview?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ label, isPreview, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
        {isPreview ? (
            <div className="p-2 font-medium">{props.value}</div>
        ) : (
            <input
                {...props}
                className="w-full p-2 bg-input border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none"
            />
        )}
    </div>
);

interface EditableFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    isPreview?: boolean;
}

const EditableField: React.FC<EditableFieldProps> = ({ className = '', isPreview, ...props }) => {
    if (isPreview) {
        if (!props.value) return null;
        return <span className={`block ${className}`}>{props.value}</span>;
    }
    return (
        <input
            {...props}
            className={`w-full bg-transparent border-b border-transparent hover:border-input/50 focus:border-primary focus:bg-input/50 focus:outline-none p-1 -m-1 rounded-sm transition-colors ${className}`}
            style={{ wordBreak: 'break-all' }}
        />
    );
};

interface EditableTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    isPreview?: boolean;
}

const EditableTextArea: React.FC<EditableTextAreaProps> = ({ className = '', isPreview, ...props }) => {
    if (isPreview) {
        if (!props.value) return null;
        return <div className={`whitespace-pre-wrap ${className}`}>{props.value}</div>;
    }
    return (
        <textarea
            {...props}
            rows={2}
            className={`w-full bg-transparent border-b border-transparent hover:border-input/50 focus:border-primary focus:bg-input/50 focus:outline-none p-1 -m-1 rounded-sm transition-colors resize-none overflow-hidden ${className}`}
            onInput={(e) => {
                e.currentTarget.style.height = 'auto';
                e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
            }}
        />
    );
};

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
