import CatalogScaffold from "./_CatalogScaffold";

export default function CatTipoTransacciones(){
  return (
    <CatalogScaffold
      titulo="Catálogo: Tipos de transacción"
      placeholderBusqueda="Buscar tipo de transacción…"
      initialData={[
        { id: 1, nombre: "Contado", descripcion: "Pago inmediato" },
        { id: 2, nombre: "Crédito", descripcion: "Pago en cuotas" },
      ]}
    />
  );
}
