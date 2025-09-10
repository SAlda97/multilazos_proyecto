import CatalogScaffold from "./_CatalogScaffold";

export default function CatCategoriaGastos(){
  return (
    <CatalogScaffold
      titulo="Catálogo: Categorías de gastos"
      placeholderBusqueda="Buscar categoría de gasto…"
      initialData={[
        { id: 1, nombre: "Operativos", descripcion: "Servicios, alquileres…" },
        { id: 2, nombre: "Logística", descripcion: "Transporte y despacho" },
        { id: 3, nombre: "Marketing", descripcion: "Publicidad y promociones" },
      ]}
    />
  );
}
