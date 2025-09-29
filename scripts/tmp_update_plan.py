import re
from pathlib import Path

path = Path("components/FinancialPlan.tsx")
content = path.read_text(encoding="utf-8")
pattern = r"  const renderMonthCells = \([\s\S]*?\n\n  const tabs:"
replacement = '''  const getManualAdjustmentValue = useCallback(
    (rowKey: string, monthKey: string) => manualAdjustments.get(rowKey)?.get(monthKey) ?? 0,
    [manualAdjustments],
  );

  const getPreventivoInputValue = useCallback(
    (row: EnrichedPlanRow, monthIndex: number, fallbackValue: number | null) => {
      const rowKey = getRowMatchKey(row);
      const monthKey = `${selectedYear}-${monthIndex}`;

      const inputsRowMap = preventivoInputs.get(rowKey);
      if (inputsRowMap && inputsRowMap.has(monthKey)) {
        return inputsRowMap.get(monthKey) ?? '';
      }

      const overridesRowMap = preventivoOverrides.get(rowKey);
      if (overridesRowMap && overridesRowMap.has(monthKey)) {
        const overrideValue = overridesRowMap.get(monthKey);
        return overrideValue === null ? '' : formatEditableNumber(overrideValue);
      }

      if (fallbackValue === null) {
        return '';
      }

      return formatEditableNumber(fallbackValue);
    },
    [preventivoInputs, preventivoOverrides, selectedYear],
  );

  const handlePreventivoInputChange = useCallback(
    (row: EnrichedPlanRow, monthIndex: number, rawValue: string) => {
      const rowKey = getRowMatchKey(row);
      const monthKey = `${selectedYear}-${monthIndex}`;

      setPreventivoInputs((prev) => {
        const next = new Map(prev);
        const previousRowMap = next.get(rowKey);
        const updatedRowMap = previousRowMap ? new Map(previousRowMap) : new Map<string, string>();
        updatedRowMap.set(monthKey, rawValue);
        next.set(rowKey, updatedRowMap);
        return next;
      });

      const trimmed = rawValue.trim();

      setPreventivoOverrides((prev) => {
        const next = new Map(prev);
        const previousRowMap = next.get(rowKey);
        const updatedRowMap = previousRowMap ? new Map(previousRowMap) : new Map<string, number | null>();

        if (trimmed == ''):
          updatedRowMap.set(monthKey, None)
          next[ rowKey ] = updatedRowMap
          return next

        parsed = parseNumberInput(rawValue)
        if parsed is None:
          return next

        updatedRowMap.set(monthKey, parsed)
        next[ rowKey ] = updatedRowMap
        return next
      })
    },
    [selectedYear],
  );
'''
print('not implemented')
