import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Table, TableStatus, Reservation, ReservationStatus } from '../types';
import { PlusIcon, TrashIcon, UndoIcon, RedoIcon, UserGroupIcon, ClockIcon, InformationCircleIcon, XCircleIcon, ExclamationCircleIcon, MinusIcon, ArrowPathIcon } from './icons/Icons';
import { format } from 'date-fns';

type Action = {
    type: 'move';
    initialTablePositions: Map<string, {x: number, y: number}>;
    startX: number;
    startY: number;
} | {
    type: 'resize';
    id: string;
    handle: 'se';
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
};

type DropValidation = {
    isValid: boolean;
    reason: 'occupato' | 'capienza' | null;
};

// Context Menu Component defined inside TableManagement
const TableContextMenu: React.FC<{
    menuPosition: { x: number; y: number };
    table: Table;
    reservation?: Reservation;
    onClose: () => void;
    onStatusChange: (status: TableStatus) => void;
    onClearTable: () => void;
    onCancelReservation: () => void;
}> = ({ menuPosition, table, reservation, onClose, onStatusChange, onClearTable, onCancelReservation }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);

    }, [onClose]);

    return (
        <div
            ref={menuRef}
            style={{ top: menuPosition.y, left: menuPosition.x }}
            className="fixed bg-white rounded-md shadow-lg text-sm text-gray-800 z-50 w-56 py-2"
        >
            <div className="px-4 py-2 border-b">
                <p className="font-bold">{table.name}</p>
                <p className="text-xs text-gray-500">{reservation?.guestName || 'Nessuna prenotazione'}</p>
            </div>
            <div className="py-1">
                 {(table.status === TableStatus.Occupied || table.status === TableStatus.Reserved) &&
                    <button onClick={onClearTable} className="w-full text-left px-4 py-2 hover:bg-gray-100">Libera e Pulisci Tavolo</button>
                 }
                 {table.status === TableStatus.Reserved && reservation &&
                    <button onClick={onCancelReservation} className="w-full text-left px-4 py-2 hover:bg-gray-100">Annulla Prenotazione</button>
                 }
            </div>
            <div className="py-1 border-t">
                 <p className="px-4 py-1 text-xs text-gray-400">Cambia Stato</p>
                 <button onClick={() => onStatusChange(TableStatus.Available)} className="w-full text-left px-4 py-2 hover:bg-gray-100">Disponibile</button>
                 <button onClick={() => onStatusChange(TableStatus.Cleaning)} className="w-full text-left px-4 py-2 hover:bg-gray-100">Da Pulire</button>
            </div>
        </div>
    );
};


const TableComponent: React.FC<{
    table: Table;
    reservation?: Reservation;
    isSelected: boolean;
    onSelect: (id: string, isShiftPressed: boolean) => void;
    onActionStart: (action: Action, e: React.MouseEvent) => void;
    onUpdate: (table: Table) => void;
    onDelete: (id: string) => void;
    onStatusChange: (id: string, status: TableStatus) => void;
    isEditMode: boolean;
    onDrop: (e: React.DragEvent, tableId: string) => void;
    dropValidation: DropValidation;
    onDragEnter: () => void;
    onDragLeave: () => void;
    onContextMenu: (e: React.MouseEvent, table: Table) => void;
}> = ({ table, reservation, isSelected, onSelect, onActionStart, onUpdate, onDelete, onStatusChange, isEditMode, onDrop, dropValidation, onDragEnter, onDragLeave, onContextMenu }) => {

    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(table.name);
    const [capacity, setCapacity] = useState(table.capacity);
    const [isNotesPopupVisible, setIsNotesPopupVisible] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
        }
    }, [isEditing]);
    
    useEffect(() => {
        setName(table.name);
        setCapacity(table.capacity);
    }, [table.name, table.capacity]);


    const handleDoubleClick = () => {
        if (isEditMode) {
            setIsEditing(true);
        }
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (table.name !== name || table.capacity !== capacity) {
            onUpdate({ ...table, name, capacity });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        }
    }

    const classes = {
        base: 'border-2',
        [TableStatus.Available]: 'bg-green-200 border-green-500 text-green-800',
        [TableStatus.Occupied]: 'bg-red-200 border-red-500 text-red-800',
        [TableStatus.Reserved]: 'bg-blue-200 border-blue-500 text-blue-800',
        [TableStatus.Cleaning]: 'bg-orange-200 border-orange-500 text-orange-800',
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isEditMode) return;
        e.stopPropagation();
        onSelect(table.id, e.shiftKey);
        onActionStart({
            type: 'move',
            initialTablePositions: new Map(),
            startX: e.clientX,
            startY: e.clientY
        }, e);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = dropValidation.isValid ? 'move' : 'none';
    };

    const handleDrop = (e: React.DragEvent) => {
        if (dropValidation.isValid) {
            onDrop(e, table.id);
        }
    };

    const outlineClass = useMemo(() => {
        if (dropValidation.isValid) return 'outline-dashed outline-4 outline-offset-4 outline-primary-500';
        if (dropValidation.reason) return 'outline-dashed outline-4 outline-offset-4 outline-red-500';
        return '';
    }, [dropValidation]);
    
    return (
        <div
            style={{
                position: 'absolute',
                left: table.x,
                top: table.y,
                width: table.width,
                height: table.height,
                cursor: isEditMode ? (isSelected ? 'move' : 'pointer') : 'context-menu',
            }}
            className={`select-none group transition-shadow duration-200 ${isSelected && isEditMode ? 'shadow-2xl z-20' : 'shadow-md z-10'}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onContextMenu={(e) => !isEditMode && onContextMenu(e, table)}
        >
             {!isEditMode && reservation && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2 bg-gray-800 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-300 pointer-events-none z-40">
                    <p className="font-bold">{reservation.guestName}</p>
                    <p>Orario: {format(new Date(reservation.reservationTime), 'p')}</p>
                </div>
            )}
            <div
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
                className={`w-full h-full flex items-center justify-center p-1 relative ${classes.base} ${classes[table.status]} ${table.shape === 'round' ? 'rounded-full' : 'rounded-lg'} 
                ${isSelected && isEditMode ? 'border-primary' : ''} 
                ${outlineClass} transition-all`}
            >
                {isEditing && isEditMode ? (
                    <div className="flex flex-col items-center p-2 bg-white rounded">
                        <input ref={inputRef} type="text" value={name} onChange={(e) => setName(e.target.value)} onBlur={handleBlur} onKeyDown={handleKeyDown} onClick={e => e.stopPropagation()} className="text-center font-bold text-sm w-16 mb-1"/>
                        <input type="number" value={capacity} onChange={(e) => setCapacity(parseInt(e.target.value) || 0)} onBlur={handleBlur} onKeyDown={handleKeyDown} onClick={e => e.stopPropagation()} className="text-center text-xs w-12" />
                    </div>
                ) : (
                    <div className="text-center truncate">
                        <p className="font-bold text-sm sm:text-base">{table.name}</p>
                        {reservation ? (
                             <div className="text-xs sm:text-sm">
                                <p className="font-semibold truncate">{reservation.guestName}</p>
                                <p>({reservation.partySize}) @ {format(new Date(reservation.reservationTime), 'p')}</p>
                            </div>
                        ) : (
                            <p className="text-xs">{table.status !== TableStatus.Available ? table.status : `Posti: ${table.capacity}`}</p>
                        )}
                    </div>
                )}
                 {!isEditMode && reservation?.notes && (
                    <>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsNotesPopupVisible(!isNotesPopupVisible); }}
                            className="absolute top-1 right-1 bg-white/70 rounded-full p-0.5 hover:bg-white transition-colors z-30"
                            title="Mostra note"
                        >
                            <InformationCircleIcon className="w-5 h-5 text-blue-600" />
                        </button>
                        {isNotesPopupVisible && (
                             <div 
                                 className="absolute top-0 right-0 w-48 bg-white p-3 rounded-lg shadow-xl border z-50 text-left"
                                 onClick={(e) => e.stopPropagation()}
                             >
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-sm text-gray-900">Note</h4>
                                    <button onClick={(e) => { e.stopPropagation(); setIsNotesPopupVisible(false); }}>
                                        <XCircleIcon className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                                    </button>
                                </div>
                                <p className="text-xs text-gray-700 whitespace-normal break-words">{reservation.notes}</p>
                            </div>
                        )}
                    </>
                )}
                 {!dropValidation.isValid && dropValidation.reason === 'capienza' && (
                    <div className={`absolute inset-0 bg-red-500 bg-opacity-50 flex items-center justify-center ${table.shape === 'round' ? 'rounded-full' : 'rounded-lg'} pointer-events-none`}>
                        <ExclamationCircleIcon className="w-1/3 h-1/3 text-white" />
                    </div>
                )}
            </div>
            {isSelected && isEditMode && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(table.id) }} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 z-30">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                    <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-primary rounded-full cursor-se-resize z-30"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            onActionStart({ type: 'resize', id: table.id, handle: 'se', startX: e.clientX, startY: e.clientY, startWidth: table.width, startHeight: table.height }, e);
                        }}/>
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex space-x-2 bg-white p-1.5 rounded-full shadow-lg z-30">
                        <button title={TableStatus.Available} onClick={(e) => { e.stopPropagation(); onStatusChange(table.id, TableStatus.Available); }} className={`w-5 h-5 rounded-full bg-green-500 hover:ring-2 ring-offset-1 ring-green-500 transition-all ${table.status === TableStatus.Available ? 'ring-2 ring-offset-1 ring-green-600' : ''}`}></button>
                        <button title={TableStatus.Occupied} onClick={(e) => { e.stopPropagation(); onStatusChange(table.id, TableStatus.Occupied); }} className={`w-5 h-5 rounded-full bg-red-500 hover:ring-2 ring-offset-1 ring-red-500 transition-all ${table.status === TableStatus.Occupied ? 'ring-2 ring-offset-1 ring-red-600' : ''}`}></button>
                        <button title={TableStatus.Reserved} onClick={(e) => { e.stopPropagation(); onStatusChange(table.id, TableStatus.Reserved); }} className={`w-5 h-5 rounded-full bg-blue-500 hover:ring-2 ring-offset-1 ring-blue-500 transition-all ${table.status === TableStatus.Reserved ? 'ring-2 ring-offset-1 ring-blue-600' : ''}`}></button>
                        <button title={TableStatus.Cleaning} onClick={(e) => { e.stopPropagation(); onStatusChange(table.id, TableStatus.Cleaning); }} className={`w-5 h-5 rounded-full bg-orange-500 hover:ring-2 ring-offset-1 ring-orange-500 transition-all ${table.status === TableStatus.Cleaning ? 'ring-2 ring-offset-1 ring-orange-600' : ''}`}></button>
                    </div>
                </>
            )}
        </div>
    );
};

const ReservationDockItem: React.FC<{reservation: Reservation}> = ({ reservation }) => {
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('application/json', JSON.stringify(reservation));
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div 
            draggable="true" 
            onDragStart={handleDragStart} 
            className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-primary-500 cursor-grab active:cursor-grabbing"
        >
            <p className="font-semibold text-gray-800">{reservation.guestName}</p>
            <div className="flex justify-between items-center text-sm text-gray-500 mt-1">
                <span className="flex items-center"><UserGroupIcon className="w-4 h-4 mr-1.5" />{reservation.partySize}</span>
                <span className="flex items-center"><ClockIcon className="w-4 h-4 mr-1.5" />{format(new Date(reservation.reservationTime), 'p')}</span>
            </div>
        </div>
    );
};

const ReservationDock: React.FC = () => {
    const { reservations } = useAppContext();
    const today = new Date();
    const unseatedReservations = reservations.filter(r => 
        new Date(r.reservationTime).toDateString() === today.toDateString() &&
        r.status === ReservationStatus.Confirmed &&
        !r.tableId
    ).sort((a,b) => new Date(b.reservationTime).getTime() - new Date(a.reservationTime).getTime());

    return (
        <div className="w-full lg:w-80 flex-shrink-0 bg-gray-50 border-l border-gray-200 flex flex-col">
            <h2 className="text-xl font-semibold text-gray-800 p-4 border-b">Prenotazioni da Accomodare</h2>
            {unseatedReservations.length > 0 ? (
                <div className="flex-grow overflow-y-auto p-4 space-y-3">
                    {unseatedReservations.map(res => <ReservationDockItem key={res.id} reservation={res} />)}
                </div>
            ) : (
                <div className="flex-grow flex items-center justify-center p-4">
                    <p className="text-center text-gray-500">Nessuna prenotazione da accomodare per oggi.</p>
                </div>
            )}
        </div>
    );
};

const GRID_SIZE = 10;

const TableManagement: React.FC = () => {
    const { tables: contextTables, reservations, loading, error, currentLocation, saveTableLayout, updateTableStatus, updateReservationStatus, assignReservationToTable, addWaitlistEntry, clearTable } = useAppContext();
    
    const [tables, setTables] = useState<Table[]>([]);
    const [history, setHistory] = useState<{ past: Table[][]; present: Table[]; future: Table[][] }>({ past: [], present: [], future: [] });

    const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());
    const [action, setAction] = useState<Action | null>(null);
    const floorPlanRef = useRef<HTMLDivElement>(null);
    const [selectionBox, setSelectionBox] = useState<{x: number, y: number, width: number, height: number} | null>(null);
    const selectionStartPoint = useRef<{x: number, y: number} | null>(null);
    const [mode, setMode] = useState<'live' | 'edit'>('live');
    const [draggedReservation, setDraggedReservation] = useState<Reservation | null>(null);
    const [dragOverTableId, setDragOverTableId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, table: Table } | null>(null);

    // Zoom and Pan state
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const panStart = useRef({ x: 0, y: 0 });
    
    const reservationsMap = React.useMemo(() => new Map(reservations.map(r => [r.id, r])), [reservations]);
    
    useEffect(() => {
        setTables(contextTables);
        if (mode === 'edit') {
            setHistory(h => ({ ...h, present: contextTables }));
        }
    }, [contextTables, mode]);

    const recordChange = useCallback((newTables: Table[]) => {
        setHistory(h => {
            if (JSON.stringify(h.present) === JSON.stringify(newTables)) return h;
            return { past: [...h.past, h.present], present: newTables, future: [] };
        });
        setTables(newTables);
    }, []);

    const canUndo = history.past.length > 0;
    const canRedo = history.future.length > 0;

    const handleUndo = useCallback(() => {
        if (!canUndo) return;
        setHistory(h => {
            const previous = h.past[h.past.length - 1];
            setTables(previous);
            return { past: h.past.slice(0, h.past.length - 1), present: previous, future: [h.present, ...h.future] };
        });
    }, [canUndo]);

    const handleRedo = useCallback(() => {
        if (!canRedo) return;
        setHistory(h => {
            const next = h.future[0];
            setTables(next);
            return { past: [...h.past, h.present], present: next, future: h.future.slice(1) };
        });
    }, [canRedo]);

    const handleAddTable = (shape: 'square' | 'round') => {
        if (!currentLocation) return;
        const rect = floorPlanRef.current!.getBoundingClientRect();
        const centerX = (rect.width / 2 - pan.x) / scale;
        const centerY = (rect.height / 2 - pan.y) / scale;

        const newTable: Table = {
            id: `new-${Date.now()}`, locationId: currentLocation.id, name: `T${tables.length + 1}`,
            capacity: shape === 'square' ? 4 : 2, status: TableStatus.Available, shape, x: centerX, y: centerY,
            width: shape === 'square' ? 80 : 60, height: shape === 'square' ? 80 : 60,
        };
        recordChange([...tables, newTable]);
    };
    
    const handleUpdateTable = (updatedTable: Table) => recordChange(tables.map(t => t.id === updatedTable.id ? updatedTable : t));

    const handleDeleteTable = (id: string) => {
        recordChange(tables.filter(t => t.id !== id));
        setSelectedTableIds(prev => { const newSet = new Set(prev); newSet.delete(id); return newSet; });
    };

    const handleDeleteSelected = () => {
        if (selectedTableIds.size === 0) return;
        if(window.confirm(`Sei sicuro di voler eliminare ${selectedTableIds.size} tavolo/i?`)) {
            recordChange(tables.filter(t => !selectedTableIds.has(t.id)));
            setSelectedTableIds(new Set());
        }
    };
    
    const handleSave = async () => {
        setIsSaving(true);
        await saveTableLayout(tables);
        setHistory(h => ({ ...h, past: [], future: [] }));
        setIsSaving(false);
    };

    const handleSelectTable = (id: string, isShiftPressed: boolean) => {
        setSelectedTableIds(prev => {
            const newSelection = new Set(prev);
            if (isShiftPressed) { newSelection.has(id) ? newSelection.delete(id) : newSelection.add(id); } 
            else { if (newSelection.has(id) && newSelection.size > 1) { return newSelection; } return new Set([id]); }
            return newSelection;
        });
    };
    
    const handleActionStart = (startedAction: Action, e: React.MouseEvent) => {
        if (startedAction.type === 'move') {
            const initialPositions = new Map<string, {x: number, y: number}>();
            tables.forEach(t => { if(selectedTableIds.has(t.id)) initialPositions.set(t.id, {x: t.x, y: t.y}) });
            setAction({ ...startedAction, initialTablePositions: initialPositions });
        } else { setAction(startedAction); }
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isPanning) {
            setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
            return;
        }

        const floorRect = floorPlanRef.current?.getBoundingClientRect();
        if (!floorRect) return;
        
        if(selectionStartPoint.current) {
            const startX = selectionStartPoint.current.x;
            const startY = selectionStartPoint.current.y;
            const currentX = (e.clientX - floorRect.left - pan.x) / scale;
            const currentY = (e.clientY - floorRect.top - pan.y) / scale;

            setSelectionBox({ x: Math.min(startX, currentX), y: Math.min(startY, currentY), width: Math.abs(currentX - startX), height: Math.abs(currentY - startY) });
            return;
        }

        if (!action) return;
        setTables(prevTables => prevTables.map(t => {
            if (action.type === 'move' && selectedTableIds.has(t.id)) {
                const initialPos = action.initialTablePositions.get(t.id);
                if (!initialPos) return t;
                const dx = (e.clientX - action.startX) / scale;
                const dy = (e.clientY - action.startY) / scale;
                const newX = initialPos.x + dx;
                const newY = initialPos.y + dy;
                const snappedX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
                const snappedY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
                return { ...t, x: Math.max(0, snappedX), y: Math.max(0, snappedY) };
            } else if (action.type === 'resize' && t.id === action.id) {
                const dx = (e.clientX - action.startX) / scale;
                const dy = (e.clientY - action.startY) / scale;
                const newWidth = Math.max(40, Math.round((action.startWidth + dx) / GRID_SIZE) * GRID_SIZE);
                const newHeight = Math.max(40, Math.round((action.startHeight + dy) / GRID_SIZE) * GRID_SIZE);
                return { ...t, width: newWidth, height: newHeight };
            }
            return t;
        }));
    }, [action, selectedTableIds, isPanning, pan, scale]);

    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
        if (selectionBox) {
            const newSelection = new Set<string>();
            tables.forEach(table => {
                const tableRect = { x: table.x, y: table.y, width: table.width, height: table.height };
                if (selectionBox.x < tableRect.x + tableRect.width && selectionBox.x + selectionBox.width > tableRect.x && selectionBox.y < tableRect.y + tableRect.height && selectionBox.y + selectionBox.height > tableRect.y) {
                    newSelection.add(table.id);
                }
            });
            setSelectedTableIds(newSelection);
        }
        selectionStartPoint.current = null;
        setSelectionBox(null);
        if (action) { recordChange(tables); }
        setAction(null);
    }, [action, tables, recordChange, selectionBox]);

    const handleFloorMouseDown = (e: React.MouseEvent) => {
        if (isSpacePressed) {
            setIsPanning(true);
            panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
            return;
        }
        if (mode !== 'edit' || (e.target !== floorPlanRef.current && !(e.target as HTMLElement).classList.contains('pan-zoom-container-child'))) return;
        
        const rect = floorPlanRef.current.getBoundingClientRect();
        const worldX = (e.clientX - rect.left - pan.x) / scale;
        const worldY = (e.clientY - rect.top - pan.y) / scale;
        selectionStartPoint.current = { x: worldX, y: worldY };
        if (!e.shiftKey) { setSelectedTableIds(new Set()); }
    };
    
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const zoomIntensity = 0.1;
        const newScale = scale - e.deltaY * zoomIntensity * 0.1;
        const clampedScale = Math.min(Math.max(0.2, newScale), 2.5);

        const rect = floorPlanRef.current!.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const pointX = (mouseX - pan.x) / scale;
        const pointY = (mouseY - pan.y) / scale;

        const newPanX = mouseX - pointX * clampedScale;
        const newPanY = mouseY - pointY * clampedScale;
        
        setScale(clampedScale);
        setPan({ x: newPanX, y: newPanY });
    };

    const handleZoomAction = (direction: 'in' | 'out' | 'reset') => {
        const zoomFactor = 1.3;
        let newScale = scale;
        if(direction === 'reset') newScale = 1;
        else newScale = direction === 'in' ? scale * zoomFactor : scale / zoomFactor;

        const clampedScale = Math.min(Math.max(0.2, newScale), 2.5);
        if (direction === 'reset') { setPan({x:0, y:0}); }

        const rect = floorPlanRef.current!.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const pointX = (centerX - pan.x) / scale;
        const pointY = (centerY - pan.y) / scale;

        const newPanX = centerX - pointX * clampedScale;
        const newPanY = centerY - pointY * clampedScale;

        setScale(clampedScale);
        if (direction !== 'reset') setPan({ x: newPanX, y: newPanY });
    };

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space' && !e.repeat) { setIsSpacePressed(true); e.preventDefault(); }};
        const handleGlobalKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') { setIsSpacePressed(false); e.preventDefault(); }};
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('keydown', handleGlobalKeyDown);
        window.addEventListener('keyup', handleGlobalKeyUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('keydown', handleGlobalKeyDown);
            window.removeEventListener('keyup', handleGlobalKeyUp);
        };
    }, [handleMouseMove, handleMouseUp]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (mode !== 'edit' || (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName))) return;
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isUndo = (isMac ? e.metaKey : e.ctrlKey) && e.key === 'z' && !e.shiftKey;
            const isRedo = (isMac ? e.metaKey && e.shiftKey && e.key === 'z' : false) || ((isMac ? !e.metaKey : !e.ctrlKey) && (e.ctrlKey || e.metaKey) && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z');

            if (isUndo) { e.preventDefault(); handleUndo(); } 
            else if (isRedo) { e.preventDefault(); handleRedo(); } 
            else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); handleDeleteSelected(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo, selectedTableIds, tables, mode]);

    const handleDragStartFloor = (e: React.DragEvent) => {
        if (mode !== 'live' || !e.dataTransfer.types.includes('application/json')) return;
        try { setDraggedReservation(JSON.parse(e.dataTransfer.getData('application/json'))); } 
        catch (error) { console.error("Failed to parse dragged reservation data", error); }
    };
    
    const handleDragLeaveFloor = (e: React.DragEvent) => {
        if (e.relatedTarget === null || !floorPlanRef.current?.contains(e.relatedTarget as Node)) {
            setDraggedReservation(null); setDragOverTableId(null);
        }
    };
    const handleDropOnTable = (e: React.DragEvent, tableId: string) => {
        e.preventDefault(); e.stopPropagation();
        const table = tables.find(t => t.id === tableId);
        if (draggedReservation && table && table.status === TableStatus.Available && table.capacity >= draggedReservation.partySize) {
            assignReservationToTable(draggedReservation.id, table.id);
        }
        setDraggedReservation(null); setDragOverTableId(null);
    };

    const handleDropOnFloor = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedReservation) {
            if (window.confirm(`${draggedReservation.guestName} non è stato assegnato a un tavolo. Vuoi aggiungerlo alla lista d'attesa?`)) {
                addWaitlistEntry({ guestName: draggedReservation.guestName, partySize: draggedReservation.partySize, phone: draggedReservation.phone, quotedWaitTime: 15 });
            }
        }
        setDraggedReservation(null); setDragOverTableId(null);
    };

    const floorCursor = isSpacePressed ? (isPanning ? 'grabbing' : 'grab') : (mode === 'edit' ? 'default' : 'auto');

    const dropValidations = useMemo(() => {
        const map = new Map<string, DropValidation>();
        for (const table of tables) {
            const isDragOver = dragOverTableId === table.id;
            if (!isDragOver || !draggedReservation) {
                map.set(table.id, { isValid: false, reason: null });
                continue;
            }
            if (table.status !== TableStatus.Available) {
                map.set(table.id, { isValid: false, reason: 'occupato' });
                continue;
            }
            if (draggedReservation && table.capacity < draggedReservation.partySize) {
                map.set(table.id, { isValid: false, reason: 'capienza' });
                continue;
            }
            map.set(table.id, { isValid: true, reason: null });
        }
        return map;
    }, [tables, dragOverTableId, draggedReservation]);

    if (loading) return <div className="text-center p-8">Caricamento informazioni tavoli...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

    return (
        <div className="space-y-4 h-full flex flex-col">
            {contextMenu && (
                <TableContextMenu
                    menuPosition={{ x: contextMenu.x, y: contextMenu.y }}
                    table={contextMenu.table}
                    reservation={contextMenu.table.reservationId ? reservationsMap.get(contextMenu.table.reservationId) : undefined}
                    onClose={() => setContextMenu(null)}
                    onStatusChange={(status) => { updateTableStatus(contextMenu.table.id, status); setContextMenu(null); }}
                    onClearTable={() => { clearTable(contextMenu.table.id); setContextMenu(null); }}
                    onCancelReservation={() => { if(contextMenu.table.reservationId) updateReservationStatus(contextMenu.table.reservationId, ReservationStatus.Cancelled); setContextMenu(null); }}
                />
            )}
            <div className="flex flex-wrap gap-4 justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Gestione Tavoli</h1>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center p-1 bg-gray-200 rounded-lg">
                        <button onClick={() => setMode('live')} className={`px-3 py-1 text-sm font-medium rounded-md ${mode === 'live' ? 'bg-white shadow' : 'text-gray-600'}`}>Vista Live</button>
                        <button onClick={() => setMode('edit')} className={`px-3 py-1 text-sm font-medium rounded-md ${mode === 'edit' ? 'bg-white shadow' : 'text-gray-600'}`}>Editor</button>
                    </div>
                     {mode === 'edit' && (
                        <>
                            <div className="flex items-center space-x-2">
                                <button onClick={handleUndo} disabled={!canUndo} className="p-2 border rounded-md bg-white disabled:opacity-50" title="Annulla (Ctrl+Z)"><UndoIcon className="h-5 w-5" /></button>
                                <button onClick={handleRedo} disabled={!canRedo} className="p-2 border rounded-md bg-white disabled:opacity-50" title="Ripristina (Ctrl+Y)"><RedoIcon className="h-5 w-5" /></button>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => handleAddTable('square')} className="inline-flex items-center px-3 py-1.5 border rounded-md bg-white text-sm"><PlusIcon className="-ml-0.5 mr-1.5 h-4 w-4" />Quadrato</button>
                                <button onClick={() => handleAddTable('round')} className="inline-flex items-center px-3 py-1.5 border rounded-md bg-white text-sm"><PlusIcon className="-ml-0.5 mr-1.5 h-4 w-4" />Rotondo</button>
                            </div>
                            <button onClick={handleSave} disabled={isSaving} className="inline-flex items-center px-4 py-1.5 border border-transparent rounded-md shadow-sm text-white bg-primary hover:bg-primary-700 text-sm font-medium focus:outline-none disabled:bg-gray-400">
                                {isSaving ? 'Salvataggio...' : 'Salva Layout'}
                            </button>
                        </>
                     )}
                </div>
            </div>
            
            <div className="flex-grow flex flex-col lg:flex-row bg-white rounded-xl shadow-md overflow-hidden">
                <div ref={floorPlanRef} className="flex-grow bg-gray-50 relative overflow-hidden" style={{ cursor: floorCursor }}
                    onMouseDown={handleFloorMouseDown} onWheel={handleWheel} onDragOver={(e) => { if(mode === 'live') e.preventDefault() }}
                    onDrop={handleDropOnFloor} onDragEnter={handleDragStartFloor} onDragLeave={handleDragLeaveFloor}
                >
                    <div className="pan-zoom-container-child absolute top-0 left-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: '0 0' }}>
                         <div className="pan-zoom-container-child absolute inset-0" style={{
                            backgroundImage: `linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)`,
                            backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                         }}/>

                        {tables.map(table => {
                            const isDragOver = dragOverTableId === table.id;
                            const dropValidation = dropValidations.get(table.id) ?? { isValid: false, reason: null };

                            return (
                                <TableComponent key={table.id} table={table} reservation={table.reservationId ? reservationsMap.get(table.reservationId) : undefined}
                                    isSelected={selectedTableIds.has(table.id)} onSelect={handleSelectTable} onActionStart={handleActionStart}
                                    onUpdate={handleUpdateTable} onDelete={handleDeleteTable} onStatusChange={updateTableStatus} isEditMode={mode === 'edit'}
                                    onDrop={handleDropOnTable} dropValidation={dropValidation}
                                    onDragEnter={() => mode === 'live' && setDragOverTableId(table.id)} onDragLeave={() => mode === 'live' && setDragOverTableId(null)}
                                    onContextMenu={(e, tbl) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, table: tbl }); }}
                                />
                            );
                        })}
                        {selectionBox && mode === 'edit' && (
                            <div className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20 pointer-events-none" style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.width, height: selectionBox.height }}/>
                        )}
                    </div>
                    <div className="absolute bottom-4 right-4 z-30 flex items-center space-x-1 bg-white p-1.5 rounded-lg shadow-lg">
                        <button onClick={() => handleZoomAction('out')} className="p-2 rounded hover:bg-gray-100" title="Zoom Out"><MinusIcon className="w-5 h-5"/></button>
                        <div className="text-sm font-medium w-12 text-center select-none" title="Reset View" onDoubleClick={() => handleZoomAction('reset')}>{Math.round(scale * 100)}%</div>
                        <button onClick={() => handleZoomAction('in')} className="p-2 rounded hover:bg-gray-100" title="Zoom In"><PlusIcon className="w-5 h-5"/></button>
                        <button onClick={() => handleZoomAction('reset')} className="p-2 rounded hover:bg-gray-100" title="Reset View"><ArrowPathIcon className="w-5 h-5"/></button>
                    </div>
                </div>
                {mode === 'live' && <ReservationDock />}
            </div>
        </div>
    );
};

export default TableManagement;






