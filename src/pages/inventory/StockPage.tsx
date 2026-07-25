/**
 * StockPage — thin route wrapper for the inventory stock management page.
 *
 * Wires the useStockPage hook to presentational sub-components (StockToolbar,
 * SelectionActionBar, StockTable, BulkEditModal) and the Pagination control.
 */
import { useStockPage } from '../../hooks/inventory/useStockPage'
import { Pagination } from '../../components/Pagination'
import { BulkEditModal, StockToolbar, SelectionActionBar, StockTable } from './Stock'

export default function StockPage() {
  const {
    isStaff,
    selectedWarehouse,
    setSelectedWarehouse,
    warehouses,
    page,
    setPage,
    searchInput,
    setSearchInput,
    commitSearch,
    data,
    isLoading,
    isError,
    error,
    totalPages,
    canEdit,
    pending,
    rowInputs,
    rowTypes,
    setRowInputs,
    stageChange,
    unstage,
    clearAll,
    applyBulkEdit,
    saveChanges,
    selected,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    allOnPageSelected,
    pendingIds,
    selectedIds,
    selectedPendingIds,
    selectedVariants,
    refetch,
    adjustIsPending,
    showBulkEditModal,
    setShowBulkEditModal,
  } = useStockPage()

  return (
    <div className="space-y-4">

      <StockToolbar
        selectedWarehouse={selectedWarehouse}
        warehouses={warehouses}
        onWarehouseChange={id => { setSelectedWarehouse(id); clearAll() }}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onCommitSearch={commitSearch}
        variantCount={data?.count ?? 0}
        pendingCount={pendingIds.length}
        adjustIsPending={adjustIsPending}
        isStaff={isStaff}
        onSaveAll={saveChanges}
        pendingIds={pendingIds}
        onDiscardAll={clearAll}
      />

      {canEdit && selectedIds.length > 0 && (
        <SelectionActionBar
          selectedCount={selectedIds.length}
          selectedPendingIds={selectedPendingIds}
          adjustIsPending={adjustIsPending}
          onBulkEdit={() => setShowBulkEditModal(true)}
          onSaveSelected={saveChanges}
          onDeselectAll={clearSelection}
        />
      )}

      <StockTable
        canEdit={canEdit}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        data={data}
        pending={pending}
        rowInputs={rowInputs}
        rowTypes={rowTypes}
        selected={selected}
        allOnPageSelected={allOnPageSelected}
        adjustIsPending={adjustIsPending}
        onToggleSelectAll={toggleSelectAll}
        onToggleSelect={toggleSelect}
        onSetRowInputs={setRowInputs}
        onStageChange={stageChange}
        onUnstage={unstage}
        onSave={saveChanges}
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={p => { setPage(p); clearSelection() }} isLoading={isLoading} />

      <BulkEditModal
        open={showBulkEditModal}
        onClose={() => setShowBulkEditModal(false)}
        selectedVariants={selectedVariants}
        onApply={applyBulkEdit}
      />
    </div>
  )
}
