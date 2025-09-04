/* ===========================================================
   ESQUEMA BASE: Rentabilidad Multilazos (SQL Server)
   Versión: 2025-09-02
   Contiene:
   - Modelo OLTP normalizado + auditoría
   - Seguridad: usuarios, roles, permisos, relaciones
   - Relación pago↔cuota + trigger anti-sobreasignación
   - Bitácora de cambios (ventas)
   - Vistas: v_cuotas_estado, vw_resumen_rentabilidades
   - Staging + SPs ETL (dimensiones, ventas/detalle, gastos)
   =========================================================== */

/* ============================
   0) CREAR BASE
   ============================ */
-- CREATE DATABASE multilazos;
-- GO
-- USE multilazos;
-- GO

/* ============================
   1) LIMPIEZA (DROP IF EXISTS)
   ============================ */
-- Vistas
IF OBJECT_ID('dbo.vw_resumen_rentabilidades', 'V') IS NOT NULL DROP VIEW dbo.vw_resumen_rentabilidades;
IF OBJECT_ID('dbo.v_cuotas_estado', 'V')           IS NOT NULL DROP VIEW dbo.v_cuotas_estado;
GO

-- Triggers
IF OBJECT_ID('dbo.trg_pago_cuota_limite', 'TR')     IS NOT NULL DROP TRIGGER dbo.trg_pago_cuota_limite;
IF OBJECT_ID('dbo.trg_bitacora_ventas', 'TR')       IS NOT NULL DROP TRIGGER dbo.trg_bitacora_ventas;
GO

-- Tablas de staging (si existen)
IF OBJECT_ID('dbo.stg_gastos', 'U')          IS NOT NULL DROP TABLE dbo.stg_gastos;
IF OBJECT_ID('dbo.stg_detalle_ventas', 'U')  IS NOT NULL DROP TABLE dbo.stg_detalle_ventas;
IF OBJECT_ID('dbo.stg_ventas', 'U')          IS NOT NULL DROP TABLE dbo.stg_ventas;
GO

-- Tablas de relación y detalle
IF OBJECT_ID('dbo.pago_cuota', 'U')          IS NOT NULL DROP TABLE dbo.pago_cuota;
IF OBJECT_ID('dbo.usuario_roles', 'U')       IS NOT NULL DROP TABLE dbo.usuario_roles;
IF OBJECT_ID('dbo.rol_permisos', 'U')        IS NOT NULL DROP TABLE dbo.rol_permisos;

-- Hechos / negocio
IF OBJECT_ID('dbo.pagos', 'U')               IS NOT NULL DROP TABLE dbo.pagos;
IF OBJECT_ID('dbo.cuota_creditos', 'U')      IS NOT NULL DROP TABLE dbo.cuota_creditos;
IF OBJECT_ID('dbo.detalle_ventas', 'U')      IS NOT NULL DROP TABLE dbo.detalle_ventas;
IF OBJECT_ID('dbo.ventas', 'U')              IS NOT NULL DROP TABLE dbo.ventas;
IF OBJECT_ID('dbo.gastos', 'U')              IS NOT NULL DROP TABLE dbo.gastos;
IF OBJECT_ID('dbo.bitacora_ventas', 'U')     IS NOT NULL DROP TABLE dbo.bitacora_ventas;

-- Dimensiones de negocio
IF OBJECT_ID('dbo.clientes', 'U')            IS NOT NULL DROP TABLE dbo.clientes;
IF OBJECT_ID('dbo.productos', 'U')           IS NOT NULL DROP TABLE dbo.productos;

-- Catálogos / seguridad
IF OBJECT_ID('dbo.categoria_productos', 'U') IS NOT NULL DROP TABLE dbo.categoria_productos;
IF OBJECT_ID('dbo.tipo_clientes', 'U')       IS NOT NULL DROP TABLE dbo.tipo_clientes;
IF OBJECT_ID('dbo.tipo_transacciones', 'U')  IS NOT NULL DROP TABLE dbo.tipo_transacciones;
IF OBJECT_ID('dbo.categoria_gastos', 'U')    IS NOT NULL DROP TABLE dbo.categoria_gastos;
IF OBJECT_ID('dbo.permisos', 'U')            IS NOT NULL DROP TABLE dbo.permisos;
IF OBJECT_ID('dbo.roles', 'U')               IS NOT NULL DROP TABLE dbo.roles;
IF OBJECT_ID('dbo.usuarios', 'U')            IS NOT NULL DROP TABLE dbo.usuarios;

-- Dimensión fecha
IF OBJECT_ID('dbo.dim_fecha', 'U')           IS NOT NULL DROP TABLE dbo.dim_fecha;
GO

/* ==========================================
   2) DIMENSIÓN FECHA (con unicidad en fecha)
   ========================================== */
CREATE TABLE dbo.dim_fecha (
    id_fecha      INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    fecha         DATE NOT NULL,
    anio          INT  NOT NULL,
    mes           INT  NOT NULL,    -- 1..12
    trimestre     INT  NOT NULL,    -- 1..4
    semana_iso    INT  NOT NULL,    -- 1..53 aprox
    dia           INT  NOT NULL,    -- 1..31
    nombre_mes    VARCHAR(20) NOT NULL DEFAULT ('SinNombreMes'),
    nombre_dia    VARCHAR(20) NOT NULL DEFAULT ('SinNombreDia'),
    es_fin_de_mes BIT NOT NULL DEFAULT (0),
    CONSTRAINT UQ_dim_fecha_fecha UNIQUE (fecha)
);
GO

/* =====================================
   3) CATÁLOGOS (con UNIQUE en nombres)
   ===================================== */
CREATE TABLE dbo.tipo_clientes (
    id_tipo_cliente         INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    nombre_tipo_cliente     VARCHAR(100) NOT NULL,
    tasa_interes_default    DECIMAL(5,2) NOT NULL DEFAULT (0),
    CONSTRAINT UQ_tipo_clientes_nombre UNIQUE (nombre_tipo_cliente),
    CONSTRAINT CHK_tipo_clientes_tasa CHECK (tasa_interes_default >= 0)
);
GO

CREATE TABLE dbo.categoria_productos (
    id_categoria        INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    nombre_categoria    VARCHAR(100) NOT NULL,
    CONSTRAINT UQ_categoria_productos_nombre UNIQUE (nombre_categoria)
);
GO

CREATE TABLE dbo.tipo_transacciones (
    id_tipo_transaccion     INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    nombre_tipo_transaccion VARCHAR(100) NOT NULL,
    CONSTRAINT UQ_tipo_transacciones_nombre UNIQUE (nombre_tipo_transaccion)
);
GO

CREATE TABLE dbo.categoria_gastos (
    id_categoria_gastos INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    nombre_categoria    VARCHAR(100) NOT NULL,
    CONSTRAINT UQ_categoria_gastos_nombre UNIQUE (nombre_categoria)
);
GO

/* =====================================
   4) SEGURIDAD: USUARIOS / ROLES / PERMISOS
   ===================================== */
CREATE TABLE dbo.usuarios (
    id_usuario           INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    username             VARCHAR(50)  NOT NULL UNIQUE,
    password_hash        VARCHAR(255) NOT NULL,
    nombre_completo      VARCHAR(100) NOT NULL,
    activo               BIT NOT NULL DEFAULT 1,
    fecha_creacion       DATETIME NOT NULL DEFAULT (GETDATE()),
    usuario_creacion     VARCHAR(50) NOT NULL DEFAULT (SUSER_SNAME()),
    fecha_modificacion   DATETIME NULL,
    usuario_modificacion VARCHAR(50) NULL
);
GO

CREATE TABLE dbo.roles (
    id_rol         INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    nombre_rol     VARCHAR(50) NOT NULL UNIQUE,
    descripcion    VARCHAR(200) NULL
);
GO

CREATE TABLE dbo.permisos (
    id_permiso   INT IDENTITY(1,1) PRIMARY KEY,
    codigo       VARCHAR(100) NOT NULL UNIQUE, -- ej: 'VENTAS_LEER'
    descripcion  VARCHAR(200) NULL
);
GO



CREATE TABLE dbo.rol_permisos (
    id_rol      INT NOT NULL,
    id_permiso  INT NOT NULL,
    CONSTRAINT PK_rol_permisos PRIMARY KEY (id_rol, id_permiso),
    CONSTRAINT FK_rol_permisos_rol     FOREIGN KEY (id_rol)     REFERENCES dbo.roles(id_rol)       ON DELETE CASCADE,
    CONSTRAINT FK_rol_permisos_permiso FOREIGN KEY (id_permiso) REFERENCES dbo.permisos(id_permiso) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.usuario_roles (
    id_usuario INT NOT NULL,
    id_rol     INT NOT NULL,
    CONSTRAINT PK_usuario_roles PRIMARY KEY (id_usuario, id_rol),
    CONSTRAINT FK_usuario_roles_usuario FOREIGN KEY (id_usuario) REFERENCES dbo.usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT FK_usuario_roles_rol     FOREIGN KEY (id_rol)     REFERENCES dbo.roles(id_rol)        ON DELETE CASCADE
);
GO

/* =====================================
   5) DIMENSIONES DE NEGOCIO (con auditoría)
   ===================================== */
CREATE TABLE dbo.clientes (
    id_cliente            INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    nombre_cliente        VARCHAR(100) NOT NULL,
    apellido_cliente      VARCHAR(100) NOT NULL,
    id_tipo_cliente       INT NOT NULL,
    fecha_creacion        DATETIME NOT NULL DEFAULT (GETDATE()),
    usuario_creacion      VARCHAR(50) NOT NULL DEFAULT (SUSER_SNAME()),
    fecha_modificacion    DATETIME NULL,
    usuario_modificacion  VARCHAR(50) NULL,
    CONSTRAINT FK_clientes_tipo_cliente
        FOREIGN KEY (id_tipo_cliente)
        REFERENCES dbo.tipo_clientes(id_tipo_cliente)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION 
);
GO
CREATE INDEX IX_clientes_tipo ON dbo.clientes(id_tipo_cliente);
GO

CREATE TABLE dbo.productos (
    id_producto           INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    nombre_producto       VARCHAR(200) NOT NULL,
    precio_unitario       DECIMAL(12,2) NOT NULL DEFAULT (0),
    costo_unitario        DECIMAL(12,2) NOT NULL DEFAULT (0),
    id_categoria          INT NOT NULL,
    fecha_creacion        DATETIME NOT NULL DEFAULT (GETDATE()),
    usuario_creacion      VARCHAR(50) NOT NULL DEFAULT (SUSER_SNAME()),
    fecha_modificacion    DATETIME NULL,
    usuario_modificacion  VARCHAR(50) NULL,
    CONSTRAINT FK_productos_categoria
        FOREIGN KEY (id_categoria)
        REFERENCES dbo.categoria_productos(id_categoria)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT CHK_productos_precios CHECK (precio_unitario >= 0 AND costo_unitario >= 0)
);
GO
CREATE INDEX IX_productos_categoria ON dbo.productos(id_categoria);
CREATE INDEX IX_productos_nombre   ON dbo.productos(nombre_producto);
GO

/* ================================
   6) HECHOS: VENTAS / DETALLE / PAGOS / CUOTAS
   ================================ */
CREATE TABLE dbo.ventas (
    id_venta              INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    id_cliente            INT NOT NULL,
    id_tipo_transaccion   INT NOT NULL,           -- 1=Contado, 2=Crédito (convención)
    id_fecha              INT NOT NULL,           -- fecha de la venta (FK dim_fecha)
    plazo_mes             INT NOT NULL DEFAULT (0),
    interes               DECIMAL(5,2) NOT NULL DEFAULT (0),
    total_venta_final     DECIMAL(12,2) NOT NULL DEFAULT (0),
    fecha_creacion        DATETIME NOT NULL DEFAULT (GETDATE()),
    usuario_creacion      VARCHAR(50) NOT NULL DEFAULT (SUSER_SNAME()),
    fecha_modificacion    DATETIME NULL,
    usuario_modificacion  VARCHAR(50) NULL,
    CONSTRAINT FK_ventas_clientes            FOREIGN KEY (id_cliente)          REFERENCES dbo.clientes(id_cliente),
    CONSTRAINT FK_ventas_tipo_transacciones  FOREIGN KEY (id_tipo_transaccion) REFERENCES dbo.tipo_transacciones(id_tipo_transaccion),
    CONSTRAINT FK_ventas_dim_fecha           FOREIGN KEY (id_fecha)            REFERENCES dbo.dim_fecha(id_fecha),
    CONSTRAINT CHK_ventas_contado_credito CHECK (
        (id_tipo_transaccion = 1 AND plazo_mes = 0 AND interes = 0) OR
        (id_tipo_transaccion = 2 AND plazo_mes > 0 AND interes >= 0)
    ),
    CONSTRAINT CHK_ventas_total CHECK (total_venta_final >= 0)
);
GO
CREATE INDEX IX_ventas_fecha   ON dbo.ventas(id_fecha);
CREATE INDEX IX_ventas_tipo    ON dbo.ventas(id_tipo_transaccion);
CREATE INDEX IX_ventas_cliente ON dbo.ventas(id_cliente);
GO

/* ===== Bitácora de cambios (ventas) + trigger ===== */
CREATE TABLE dbo.bitacora_ventas (
    id_bitacora      BIGINT IDENTITY(1,1) PRIMARY KEY,
    id_venta         INT NOT NULL,
    operacion        VARCHAR(10) NOT NULL,        -- INSERT/UPDATE/DELETE
    datos_anteriores NVARCHAR(MAX) NULL,          -- JSON
    datos_nuevos     NVARCHAR(MAX) NULL,          -- JSON
    usuario_evento   VARCHAR(100) NOT NULL DEFAULT (SUSER_SNAME()),
    fecha_evento     DATETIME NOT NULL DEFAULT (GETDATE())
);
GO

CREATE OR ALTER TRIGGER dbo.trg_bitacora_ventas
ON dbo.ventas
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @usuario VARCHAR(100) = SUSER_SNAME();

    /* ===== INSERT ===== */
    INSERT INTO dbo.bitacora_ventas (id_venta, operacion, datos_anteriores, datos_nuevos, usuario_evento)
    SELECT
        i.id_venta,
        'INSERT',
        NULL,
        (
            SELECT 
                i.id_venta, i.id_cliente, i.id_tipo_transaccion, i.id_fecha,
                i.plazo_mes, i.interes, i.total_venta_final,
                i.fecha_creacion, i.usuario_creacion, i.fecha_modificacion, i.usuario_modificacion
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ),
        @usuario
    FROM inserted i
    LEFT JOIN deleted d ON 1 = 0;  -- explícito para dejar clara la rama

    /* ===== DELETE ===== */
    INSERT INTO dbo.bitacora_ventas (id_venta, operacion, datos_anteriores, datos_nuevos, usuario_evento)
    SELECT
        d.id_venta,
        'DELETE',
        (
            SELECT 
                d.id_venta, d.id_cliente, d.id_tipo_transaccion, d.id_fecha,
                d.plazo_mes, d.interes, d.total_venta_final,
                d.fecha_creacion, d.usuario_creacion, d.fecha_modificacion, d.usuario_modificacion
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ),
        NULL,
        @usuario
    FROM deleted d
    LEFT JOIN inserted i ON 1 = 0;

    /* ===== UPDATE ===== */
    INSERT INTO dbo.bitacora_ventas (id_venta, operacion, datos_anteriores, datos_nuevos, usuario_evento)
    SELECT
        i.id_venta,
        'UPDATE',
        (
            SELECT 
                d.id_venta, d.id_cliente, d.id_tipo_transaccion, d.id_fecha,
                d.plazo_mes, d.interes, d.total_venta_final,
                d.fecha_creacion, d.usuario_creacion, d.fecha_modificacion, d.usuario_modificacion
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ),
        (
            SELECT 
                i.id_venta, i.id_cliente, i.id_tipo_transaccion, i.id_fecha,
                i.plazo_mes, i.interes, i.total_venta_final,
                i.fecha_creacion, i.usuario_creacion, i.fecha_modificacion, i.usuario_modificacion
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ),
        @usuario
    FROM inserted i
    JOIN deleted  d ON d.id_venta = i.id_venta;
END;
GO

/* ===== Fin bitácora ===== */

CREATE TABLE dbo.detalle_ventas (
    id_detalle_venta      INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    id_venta              INT NOT NULL,
    id_producto           INT NOT NULL,
    cantidad              DECIMAL(12,2) NOT NULL DEFAULT (0),
    precio_unitario       DECIMAL(12,2) NOT NULL DEFAULT (0),
    costo_unitario_venta  DECIMAL(12,2) NOT NULL DEFAULT (0),  -- costo histórico
    subtotal              AS (CONVERT(DECIMAL(12,2), cantidad * precio_unitario)) PERSISTED,
    fecha_creacion        DATETIME NOT NULL DEFAULT (GETDATE()),
    usuario_creacion      VARCHAR(50) NOT NULL DEFAULT (SUSER_SNAME()),
    fecha_modificacion    DATETIME NULL,
    usuario_modificacion  VARCHAR(50) NULL,
    CONSTRAINT FK_detalle_ventas_venta    FOREIGN KEY (id_venta)   REFERENCES dbo.ventas(id_venta)    ON DELETE CASCADE,
    CONSTRAINT FK_detalle_ventas_producto FOREIGN KEY (id_producto) REFERENCES dbo.productos(id_producto),
    CONSTRAINT UQ_detalle_venta UNIQUE (id_venta, id_producto),
    CONSTRAINT CHK_detalle_ventas_cant_precio CHECK (cantidad > 0 AND precio_unitario >= 0 AND costo_unitario_venta >= 0)
);
GO


CREATE INDEX IX_detalle_ventas_producto ON dbo.detalle_ventas(id_producto);
GO

CREATE TABLE dbo.pagos (
    id_pago             INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    id_venta            INT NOT NULL,
    id_fecha            INT NOT NULL, -- fecha del pago (FK dim_fecha)
    monto_pago          DECIMAL(12,2) NOT NULL DEFAULT (0),
    fecha_creacion      DATETIME NOT NULL DEFAULT (GETDATE()),
    usuario_creacion    VARCHAR(50) NOT NULL DEFAULT (SUSER_SNAME()),
    fecha_modificacion  DATETIME NULL,
    usuario_modificacion VARCHAR(50) NULL,
    CONSTRAINT FK_pagos_venta FOREIGN KEY (id_venta) REFERENCES dbo.ventas(id_venta),
    CONSTRAINT FK_pagos_fecha FOREIGN KEY (id_fecha) REFERENCES dbo.dim_fecha(id_fecha),
    CONSTRAINT CHK_pagos_monto CHECK (monto_pago >= 0)
);
GO
CREATE INDEX IX_pagos_venta ON dbo.pagos(id_venta);
CREATE INDEX IX_pagos_fecha ON dbo.pagos(id_fecha);
GO

CREATE TABLE dbo.cuota_creditos (
    id_cuota            INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    id_venta            INT NOT NULL,
    numero_cuota        INT NOT NULL,                         -- 1..N
    id_fecha_venc       INT NOT NULL,                         -- FK dim_fecha
    monto_programado    DECIMAL(12,2) NOT NULL DEFAULT (0),
    fecha_creacion      DATETIME NOT NULL DEFAULT (GETDATE()),
    usuario_creacion    VARCHAR(50) NOT NULL DEFAULT (SUSER_SNAME()),
    fecha_modificacion  DATETIME NULL,
    usuario_modificacion VARCHAR(50) NULL,
    CONSTRAINT FK_cuota_venta      FOREIGN KEY (id_venta)      REFERENCES dbo.ventas(id_venta) ON DELETE CASCADE,
    CONSTRAINT FK_cuota_fecha_venc FOREIGN KEY (id_fecha_venc) REFERENCES dbo.dim_fecha(id_fecha),
    CONSTRAINT UQ_cuota_venta_num UNIQUE (id_venta, numero_cuota),
    CONSTRAINT CHK_cuota_valores CHECK (numero_cuota > 0 AND monto_programado >= 0)
);
GO
CREATE INDEX IX_cuota_venta      ON dbo.cuota_creditos(id_venta);
CREATE INDEX IX_cuota_fecha_venc ON dbo.cuota_creditos(id_fecha_venc);
GO

/* ======================
   7) GASTOS (con auditoría)
   ====================== */
CREATE TABLE dbo.gastos (
    id_gasto              INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    nombre_gasto          VARCHAR(100) NOT NULL,
    monto_gasto           DECIMAL(12,2) NOT NULL DEFAULT (0),
    id_fecha              INT NOT NULL,
    id_categoria_gastos   INT NOT NULL,
    fecha_creacion        DATETIME NOT NULL DEFAULT (GETDATE()),
    usuario_creacion      VARCHAR(50) NOT NULL DEFAULT (SUSER_SNAME()),
    fecha_modificacion    DATETIME NULL,
    usuario_modificacion  VARCHAR(50) NULL,
    CONSTRAINT FK_gastos_fecha     FOREIGN KEY (id_fecha)            REFERENCES dbo.dim_fecha(id_fecha),
    CONSTRAINT FK_gastos_categoria FOREIGN KEY (id_categoria_gastos) REFERENCES dbo.categoria_gastos(id_categoria_gastos),
    CONSTRAINT CHK_gastos_monto CHECK (monto_gasto >= 0)
);
GO
CREATE INDEX IX_gastos_fecha     ON dbo.gastos(id_fecha);
CREATE INDEX IX_gastos_categoria ON dbo.gastos(id_categoria_gastos);
GO

/* ============================================================
   8) TABLA INTERMEDIA PAGO↔CUOTA + TRIGGER límite
   ============================================================ */
CREATE TABLE dbo.pago_cuota (
    id_pago             INT NOT NULL,
    id_cuota            INT NOT NULL,
    monto_asignado      DECIMAL(12,2) NOT NULL,
    fecha_creacion      DATETIME NOT NULL DEFAULT (GETDATE()),
    usuario_creacion    VARCHAR(50) NOT NULL DEFAULT (SUSER_SNAME()),
    fecha_modificacion  DATETIME NULL,
    usuario_modificacion VARCHAR(50) NULL,
    CONSTRAINT PK_pago_cuota PRIMARY KEY (id_pago, id_cuota),
    CONSTRAINT FK_pago_cuota_pagos  FOREIGN KEY (id_pago)  REFERENCES dbo.pagos(id_pago)          ON DELETE CASCADE,
    CONSTRAINT FK_pago_cuota_cuotas FOREIGN KEY (id_cuota) REFERENCES dbo.cuota_creditos(id_cuota) ON DELETE CASCADE,
    CONSTRAINT CHK_pago_cuota_monto CHECK (monto_asignado > 0)
);
GO
CREATE INDEX IX_pago_cuota_cuota ON dbo.pago_cuota(id_cuota);
CREATE INDEX IX_pago_cuota_pago  ON dbo.pago_cuota(id_pago);
GO

CREATE OR ALTER TRIGGER dbo.trg_pago_cuota_limite
ON dbo.pago_cuota
AFTER INSERT, UPDATE
AS
BEGIN
  SET NOCOUNT ON;

  IF EXISTS (
    SELECT 1
    FROM dbo.cuota_creditos c
    JOIN (
      SELECT id_cuota, SUM(monto_asignado) AS total_asignado
      FROM dbo.pago_cuota
      GROUP BY id_cuota
    ) x ON x.id_cuota = c.id_cuota
    WHERE x.total_asignado > c.monto_programado
  )
  BEGIN
    RAISERROR ('La suma de asignaciones supera el monto programado de la cuota.', 16, 1);
    ROLLBACK TRANSACTION;
    RETURN;
  END
END;
GO

/* ============================================================
   9) VISTAS: Estado de cuotas y Resumen de rentabilidades
   ============================================================ */
CREATE OR ALTER VIEW dbo.v_cuotas_estado
AS
SELECT
  c.id_cuota,
  c.id_venta,
  c.numero_cuota,
  c.id_fecha_venc,
  c.monto_programado,
  ISNULL(SUM(pc.monto_asignado),0)                                          AS monto_pagado,
  CONVERT(DECIMAL(12,2), c.monto_programado - ISNULL(SUM(pc.monto_asignado),0)) AS saldo_pendiente,
  CASE
    WHEN ISNULL(SUM(pc.monto_asignado),0) = 0 THEN 'pendiente'
    WHEN ISNULL(SUM(pc.monto_asignado),0)  < c.monto_programado THEN 'parcial'
    ELSE 'pagada'
  END AS estado
FROM dbo.cuota_creditos c
LEFT JOIN dbo.pago_cuota pc ON pc.id_cuota = c.id_cuota
GROUP BY c.id_cuota, c.id_venta, c.numero_cuota, c.id_fecha_venc, c.monto_programado;
GO

CREATE OR ALTER VIEW dbo.vw_resumen_rentabilidades
AS
WITH base AS (
    SELECT
        df.anio,
        df.mes,
        tc.id_tipo_cliente,
        vt.id_tipo_transaccion,
        cp.id_categoria AS id_categoria_producto,
        SUM(dv.cantidad * dv.precio_unitario)      AS total_venta,
        SUM(dv.cantidad * dv.costo_unitario_venta) AS total_costo
    FROM dbo.ventas vt
    JOIN dbo.detalle_ventas dv       ON dv.id_venta = vt.id_venta
    JOIN dbo.dim_fecha df            ON df.id_fecha = vt.id_fecha
    JOIN dbo.clientes cl             ON cl.id_cliente = vt.id_cliente
    JOIN dbo.tipo_clientes tc        ON tc.id_tipo_cliente = cl.id_tipo_cliente
    JOIN dbo.productos pr            ON pr.id_producto = dv.id_producto
    JOIN dbo.categoria_productos cp  ON cp.id_categoria = pr.id_categoria
    GROUP BY df.anio, df.mes, tc.id_tipo_cliente, vt.id_tipo_transaccion, cp.id_categoria
),
ventas_periodo AS (  -- ventas totales por periodo (para prorrateo de gastos)
    SELECT anio, mes, SUM(total_venta) AS total_venta_periodo
    FROM base
    GROUP BY anio, mes
),
gastos_periodo AS (  -- gastos totales por periodo
    SELECT df.anio, df.mes, SUM(g.monto_gasto) AS total_gasto_periodo
    FROM dbo.gastos g
    JOIN dbo.dim_fecha df ON df.id_fecha = g.id_fecha
    GROUP BY df.anio, df.mes
),
-- Fechas de pago y venta para DSO
pagos_join AS (
    SELECT p.id_venta, fp.fecha AS fecha_pago
    FROM dbo.pagos p
    JOIN dbo.dim_fecha fp ON fp.id_fecha = p.id_fecha
),
ventas_fechas AS (
    SELECT v.id_venta, fv.fecha AS fecha_venta
    FROM dbo.ventas v
    JOIN dbo.dim_fecha fv ON fv.id_fecha = v.id_fecha
),
-- AJUSTE 1: cada venta puede tener varias líneas; tomamos una fila por venta-categoría
ventas_categorias AS (
    SELECT DISTINCT
        v.id_venta,
        cp.id_categoria AS id_categoria_producto
    FROM dbo.ventas v
    JOIN dbo.detalle_ventas dv       ON dv.id_venta = v.id_venta
    JOIN dbo.productos pr            ON pr.id_producto = dv.id_producto
    JOIN dbo.categoria_productos cp  ON cp.id_categoria = pr.id_categoria
),
dso_segmento AS (  -- DSO promedio por segmento usando venta-categoría DISTINCT
    SELECT
        df.anio,
        df.mes,
        tc.id_tipo_cliente,
        v.id_tipo_transaccion,
        vc.id_categoria_producto,
        AVG(DATEDIFF(DAY, vf.fecha_venta, pj.fecha_pago) * 1.0) AS dso_dias_prom
    FROM dbo.ventas v
    JOIN ventas_categorias vc  ON vc.id_venta = v.id_venta
    JOIN ventas_fechas vf      ON vf.id_venta = v.id_venta
    JOIN pagos_join pj         ON pj.id_venta = v.id_venta
    JOIN dbo.clientes cl       ON cl.id_cliente = v.id_cliente
    JOIN dbo.tipo_clientes tc  ON tc.id_tipo_cliente = cl.id_tipo_cliente
    JOIN dbo.dim_fecha df      ON df.id_fecha = v.id_fecha
    GROUP BY df.anio, df.mes, tc.id_tipo_cliente, v.id_tipo_transaccion, vc.id_categoria_producto
),
-- AJUSTE 2: proporción decimal segura para prorratear gastos
proporcion AS (
    SELECT
        b.anio,
        b.mes,
        b.id_tipo_cliente,
        b.id_tipo_transaccion,
        b.id_categoria_producto,
        CAST(b.total_venta AS DECIMAL(18,6)) /
        NULLIF(CAST(vp.total_venta_periodo AS DECIMAL(18,6)), 0) AS pct
    FROM base b
    JOIN ventas_periodo vp
      ON vp.anio = b.anio AND vp.mes = b.mes
)
SELECT
    b.anio,
    b.mes,
    b.id_tipo_cliente,
    b.id_tipo_transaccion,
    b.id_categoria_producto,
    b.total_venta,
    b.total_costo,
    (b.total_venta - b.total_costo) AS margen_bruto,
    -- Gastos asignados = gastos del periodo * % participación del segmento
    CONVERT(DECIMAL(12,2),
        ISNULL(gp.total_gasto_periodo, 0) * ISNULL(p.pct, 0)
    ) AS gastos_asignados,
    -- Margen neto
    CONVERT(DECIMAL(12,2),
        (b.total_venta - b.total_costo)
        - (ISNULL(gp.total_gasto_periodo, 0) * ISNULL(p.pct, 0))
    ) AS margen_neto,
    ds.dso_dias_prom
FROM base b
LEFT JOIN gastos_periodo gp
  ON gp.anio = b.anio AND gp.mes = b.mes
LEFT JOIN proporcion p
  ON p.anio = b.anio
 AND p.mes  = b.mes
 AND p.id_tipo_cliente      = b.id_tipo_cliente
 AND p.id_tipo_transaccion  = b.id_tipo_transaccion
 AND p.id_categoria_producto= b.id_categoria_producto
LEFT JOIN dso_segmento ds
  ON ds.anio = b.anio 
 AND ds.mes  = b.mes 
 AND ds.id_tipo_cliente      = b.id_tipo_cliente
 AND ds.id_tipo_transaccion  = b.id_tipo_transaccion
 AND ds.id_categoria_producto= b.id_categoria_producto;
GO

/* =======================================================
   10) STAGING PARA ETL (se limpian en cada corrida)
   ======================================================= */
CREATE TABLE dbo.stg_ventas (
    id_externo_venta   VARCHAR(50) NULL,
    fecha              DATE NOT NULL,
    cliente_nombre     VARCHAR(100) NOT NULL,
    cliente_apellido   VARCHAR(100) NOT NULL,
    tipo_cliente       VARCHAR(100) NOT NULL,   -- 'Mayorista'/'Minorista'
    tipo_transaccion   VARCHAR(100) NOT NULL,   -- 'Contado'/'Crédito'
    plazo_mes          INT NULL,
    interes            DECIMAL(5,2) NULL,
    total_venta_final  DECIMAL(12,2) NOT NULL
);
GO

CREATE TABLE dbo.stg_detalle_ventas (
    id_externo_venta   VARCHAR(50) NULL,
    producto           VARCHAR(200) NOT NULL,
    categoria_producto VARCHAR(100) NOT NULL,
    cantidad           DECIMAL(12,2) NOT NULL,
    precio_unitario    DECIMAL(12,2) NOT NULL,
    costo_unitario     DECIMAL(12,2) NOT NULL
);
GO

CREATE TABLE dbo.stg_gastos (
    fecha              DATE NOT NULL,
    categoria_gasto    VARCHAR(100) NOT NULL,
    nombre_gasto       VARCHAR(100) NOT NULL,
    monto_gasto        DECIMAL(12,2) NOT NULL
);
GO

/* =======================================================
   11) SPs ETL: Dimensiones, Ventas/Detalle, Gastos
   ======================================================= */
CREATE OR ALTER PROCEDURE dbo.sp_etl_cargar_dimensiones
AS
BEGIN
    SET NOCOUNT ON;

    -- dim_fecha
    INSERT INTO dbo.dim_fecha (fecha, anio, mes, trimestre, semana_iso, dia)
    SELECT DISTINCT s.fecha,
           YEAR(s.fecha),
           MONTH(s.fecha),
           DATEPART(QUARTER, s.fecha),
           DATEPART(ISO_WEEK, s.fecha),
           DAY(s.fecha)
    FROM (
        SELECT fecha FROM dbo.stg_ventas
        UNION
        SELECT fecha FROM dbo.stg_gastos
    ) s
    LEFT JOIN dbo.dim_fecha d ON d.fecha = s.fecha
    WHERE d.id_fecha IS NULL;

    -- tipo_clientes
    INSERT INTO dbo.tipo_clientes (nombre_tipo_cliente)
    SELECT DISTINCT sv.tipo_cliente
    FROM dbo.stg_ventas sv
    LEFT JOIN dbo.tipo_clientes tc ON tc.nombre_tipo_cliente = sv.tipo_cliente
    WHERE tc.id_tipo_cliente IS NULL;

    -- categoria_productos
    INSERT INTO dbo.categoria_productos (nombre_categoria)
    SELECT DISTINCT sd.categoria_producto
    FROM dbo.stg_detalle_ventas sd
    LEFT JOIN dbo.categoria_productos cp ON cp.nombre_categoria = sd.categoria_producto
    WHERE cp.id_categoria IS NULL;

    -- productos
    INSERT INTO dbo.productos (nombre_producto, precio_unitario, costo_unitario, id_categoria)
    SELECT DISTINCT sd.producto, sd.precio_unitario, sd.costo_unitario, cp.id_categoria
    FROM dbo.stg_detalle_ventas sd
    JOIN dbo.categoria_productos cp ON cp.nombre_categoria = sd.categoria_producto
    LEFT JOIN dbo.productos p ON p.nombre_producto = sd.producto
    WHERE p.id_producto IS NULL;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_etl_cargar_ventas
AS
BEGIN
    SET NOCOUNT ON;

    -- 1) Clientes
    INSERT INTO dbo.clientes (nombre_cliente, apellido_cliente, id_tipo_cliente)
    SELECT DISTINCT sv.cliente_nombre, sv.cliente_apellido, tc.id_tipo_cliente
    FROM dbo.stg_ventas sv
    JOIN dbo.tipo_clientes tc ON tc.nombre_tipo_cliente = sv.tipo_cliente
    LEFT JOIN dbo.clientes c
      ON c.nombre_cliente = sv.cliente_nombre
     AND c.apellido_cliente = sv.cliente_apellido
     AND c.id_tipo_cliente = tc.id_tipo_cliente
    WHERE c.id_cliente IS NULL;

    -- 2) Ventas (insert-only; ajusta ON según clave de negocio si requieres upsert)
    INSERT INTO dbo.ventas (id_cliente, id_tipo_transaccion, id_fecha, plazo_mes, interes, total_venta_final)
    SELECT c.id_cliente,
           tt.id_tipo_transaccion,
           df.id_fecha,
           ISNULL(sv.plazo_mes,0),
           ISNULL(sv.interes,0),
           sv.total_venta_final
    FROM dbo.stg_ventas sv
    JOIN dbo.tipo_clientes tc    ON tc.nombre_tipo_cliente = sv.tipo_cliente
    JOIN dbo.clientes c          ON c.nombre_cliente = sv.cliente_nombre
                                AND c.apellido_cliente = sv.cliente_apellido
                                AND c.id_tipo_cliente = tc.id_tipo_cliente
    JOIN dbo.tipo_transacciones tt ON tt.nombre_tipo_transaccion = sv.tipo_transaccion
    JOIN dbo.dim_fecha df        ON df.fecha = sv.fecha;

    -- 3) Detalle
    INSERT INTO dbo.detalle_ventas (id_venta, id_producto, cantidad, precio_unitario, costo_unitario_venta)
    SELECT v.id_venta, p.id_producto, sd.cantidad, sd.precio_unitario, sd.costo_unitario
    FROM dbo.stg_detalle_ventas sd
    JOIN dbo.stg_ventas sv       ON sv.id_externo_venta = sd.id_externo_venta
    JOIN dbo.tipo_clientes tc    ON tc.nombre_tipo_cliente = sv.tipo_cliente
    JOIN dbo.clientes c          ON c.nombre_cliente = sv.cliente_nombre
                                AND c.apellido_cliente = sv.cliente_apellido
                                AND c.id_tipo_cliente = tc.id_tipo_cliente
    JOIN dbo.tipo_transacciones tt ON tt.nombre_tipo_transaccion = sv.tipo_transaccion
    JOIN dbo.dim_fecha df        ON df.fecha = sv.fecha
    JOIN dbo.ventas v            ON v.id_cliente = c.id_cliente AND v.id_fecha = df.id_fecha AND v.id_tipo_transaccion = tt.id_tipo_transaccion
    JOIN dbo.productos p         ON p.nombre_producto = sd.producto;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_etl_cargar_gastos
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.categoria_gastos (nombre_categoria)
    SELECT DISTINCT s.categoria_gasto
    FROM dbo.stg_gastos s
    LEFT JOIN dbo.categoria_gastos cg ON cg.nombre_categoria = s.categoria_gasto
    WHERE cg.id_categoria_gastos IS NULL;

    INSERT INTO dbo.gastos (nombre_gasto, monto_gasto, id_fecha, id_categoria_gastos)
    SELECT s.nombre_gasto, s.monto_gasto, df.id_fecha, cg.id_categoria_gastos
    FROM dbo.stg_gastos s
    JOIN dbo.dim_fecha df         ON df.fecha = s.fecha
    JOIN dbo.categoria_gastos cg  ON cg.nombre_categoria = s.categoria_gasto;
END;
GO



/* =======================================================
   13) ÍNDICES ADICIONALES (consultas comunes)
   ======================================================= */
CREATE INDEX IX_ventas_fecha_tipo_cliente
ON dbo.ventas(id_fecha, id_tipo_transaccion, id_cliente);
GO


CREATE OR ALTER FUNCTION dbo.fn_resumen_mensual(
    @desde DATE = NULL,                  -- inclusive (si NULL, sin límite inferior)
    @hasta DATE = NULL,                  -- inclusive (si NULL, sin límite superior)
    @id_tipo_cliente INT = NULL,         -- filtro opcional
    @id_tipo_transaccion INT = NULL,     -- filtro opcional
    @id_categoria_producto INT = NULL    -- filtro opcional
)
RETURNS TABLE
AS
RETURN
/* ============================================================
   Devuelve KPIs mensuales:
   - total_venta, total_costo, margen_bruto, gastos_asignados, margen_neto, dso_dias_prom
   - clave: anio, mes, id_tipo_cliente, id_tipo_transaccion, id_categoria_producto
   - nombres incluidos para filtros en UI
   Incluye meses sin datos (cero) dentro del rango [@desde, @hasta].
   Ajustes:
   (1) DSO sin duplicados por venta-categoría (ventas_categorias)
   (2) Prorrateo decimal seguro con CAST/NULLIF
   ============================================================ */
WITH rango AS (
    SELECT
        ISNULL(@desde, (SELECT MIN(fecha) FROM dbo.dim_fecha)) AS f_ini,
        ISNULL(@hasta, (SELECT MAX(fecha) FROM dbo.dim_fecha)) AS f_fin
),
meses AS (  -- calendario de meses dentro del rango solicitado (cubre ceros)
    SELECT DISTINCT
        DATEFROMPARTS(df.anio, df.mes, 1) AS mes_inicio,
        df.anio, df.mes
    FROM dbo.dim_fecha df
    CROSS JOIN rango r
    WHERE df.fecha BETWEEN r.f_ini AND r.f_fin
),
base AS (
    SELECT
        df.anio,
        df.mes,
        tc.id_tipo_cliente,
        vt.id_tipo_transaccion,
        cp.id_categoria AS id_categoria_producto,
        SUM(dv.cantidad * dv.precio_unitario)      AS total_venta,
        SUM(dv.cantidad * dv.costo_unitario_venta) AS total_costo
    FROM dbo.ventas vt
    JOIN dbo.detalle_ventas dv       ON dv.id_venta = vt.id_venta
    JOIN dbo.dim_fecha df            ON df.id_fecha = vt.id_fecha
    JOIN dbo.clientes cl             ON cl.id_cliente = vt.id_cliente
    JOIN dbo.tipo_clientes tc        ON tc.id_tipo_cliente = cl.id_tipo_cliente
    JOIN dbo.productos pr            ON pr.id_producto = dv.id_producto
    JOIN dbo.categoria_productos cp  ON cp.id_categoria = pr.id_categoria
    CROSS JOIN rango r
    WHERE DATEFROMPARTS(df.anio, df.mes, 1) BETWEEN DATEFROMPARTS(YEAR(r.f_ini), MONTH(r.f_ini), 1)
                                               AND DATEFROMPARTS(YEAR(r.f_fin), MONTH(r.f_fin), 1)
      AND (@id_tipo_cliente     IS NULL OR tc.id_tipo_cliente     = @id_tipo_cliente)
      AND (@id_tipo_transaccion IS NULL OR vt.id_tipo_transaccion = @id_tipo_transaccion)
      AND (@id_categoria_producto IS NULL OR cp.id_categoria      = @id_categoria_producto)
    GROUP BY df.anio, df.mes, tc.id_tipo_cliente, vt.id_tipo_transaccion, cp.id_categoria
),
ventas_periodo AS (
    SELECT anio, mes, SUM(total_venta) AS total_venta_periodo
    FROM base
    GROUP BY anio, mes
),
gastos_periodo AS (
    SELECT df.anio, df.mes, SUM(g.monto_gasto) AS total_gasto_periodo
    FROM dbo.gastos g
    JOIN dbo.dim_fecha df ON df.id_fecha = g.id_fecha
    CROSS JOIN rango r
    WHERE DATEFROMPARTS(df.anio, df.mes, 1) BETWEEN DATEFROMPARTS(YEAR(r.f_ini), MONTH(r.f_ini), 1)
                                               AND DATEFROMPARTS(YEAR(r.f_fin), MONTH(r.f_fin), 1)
    GROUP BY df.anio, df.mes
),
pagos_join AS (
    SELECT p.id_venta, fp.fecha AS fecha_pago
    FROM dbo.pagos p
    JOIN dbo.dim_fecha fp ON fp.id_fecha = p.id_fecha
),
ventas_fechas AS (
    SELECT v.id_venta, fv.fecha AS fecha_venta
    FROM dbo.ventas v
    JOIN dbo.dim_fecha fv ON fv.id_fecha = v.id_fecha
),
ventas_categorias AS (  -- una fila por venta y categoría (evita sesgo en DSO)
    SELECT DISTINCT
        v.id_venta,
        cp.id_categoria AS id_categoria_producto
    FROM dbo.ventas v
    JOIN dbo.detalle_ventas dv       ON dv.id_venta = v.id_venta
    JOIN dbo.productos pr            ON pr.id_producto = dv.id_producto
    JOIN dbo.categoria_productos cp  ON cp.id_categoria = pr.id_categoria
),
dso_segmento AS (  -- DSO promedio por segmento
    SELECT
        df.anio,
        df.mes,
        tc.id_tipo_cliente,
        v.id_tipo_transaccion,
        vc.id_categoria_producto,
        AVG(DATEDIFF(DAY, vf.fecha_venta, pj.fecha_pago) * 1.0) AS dso_dias_prom
    FROM dbo.ventas v
    JOIN ventas_categorias vc  ON vc.id_venta = v.id_venta
    JOIN ventas_fechas vf      ON vf.id_venta = v.id_venta
    JOIN pagos_join pj         ON pj.id_venta = v.id_venta
    JOIN dbo.clientes cl       ON cl.id_cliente = v.id_cliente
    JOIN dbo.tipo_clientes tc  ON tc.id_tipo_cliente = cl.id_tipo_cliente
    JOIN dbo.dim_fecha df      ON df.id_fecha = v.id_fecha
    CROSS JOIN rango r
    WHERE DATEFROMPARTS(df.anio, df.mes, 1) BETWEEN DATEFROMPARTS(YEAR(r.f_ini), MONTH(r.f_ini), 1)
                                               AND DATEFROMPARTS(YEAR(r.f_fin), MONTH(r.f_fin), 1)
      AND (@id_tipo_cliente     IS NULL OR tc.id_tipo_cliente     = @id_tipo_cliente)
      AND (@id_tipo_transaccion IS NULL OR v.id_tipo_transaccion  = @id_tipo_transaccion)
      AND (@id_categoria_producto IS NULL OR vc.id_categoria_producto = @id_categoria_producto)
    GROUP BY df.anio, df.mes, tc.id_tipo_cliente, v.id_tipo_transaccion, vc.id_categoria_producto
),
proporcion AS (  -- prorrateo seguro de gastos
    SELECT
        b.anio,
        b.mes,
        b.id_tipo_cliente,
        b.id_tipo_transaccion,
        b.id_categoria_producto,
        CAST(b.total_venta AS DECIMAL(18,6)) /
        NULLIF(CAST(vp.total_venta_periodo AS DECIMAL(18,6)), 0) AS pct
    FROM base b
    JOIN ventas_periodo vp
      ON vp.anio = b.anio AND vp.mes = b.mes
),
nombres AS (
    SELECT
        tc.id_tipo_cliente, tc.nombre_tipo_cliente,
        tt.id_tipo_transaccion, tt.nombre_tipo_transaccion,
        cp.id_categoria AS id_categoria_producto, cp.nombre_categoria
    FROM dbo.tipo_clientes tc
    CROSS JOIN dbo.tipo_transacciones tt
    CROSS JOIN dbo.categoria_productos cp
)
SELECT
    m.anio,
    m.mes,
    DATEFROMPARTS(m.anio, m.mes, 1) AS mes_inicio,   -- para graficar por mes
    b.id_tipo_cliente,
    ISNULL(tc.nombre_tipo_cliente, 'N/A') AS nombre_tipo_cliente,
    b.id_tipo_transaccion,
    ISNULL(tt.nombre_tipo_transaccion, 'N/A') AS nombre_tipo_transaccion,
    b.id_categoria_producto,
    ISNULL(cp.nombre_categoria, 'N/A') AS nombre_categoria_producto,
    ISNULL(b.total_venta, 0) AS total_venta,
    ISNULL(b.total_costo, 0) AS total_costo,
    ISNULL(b.total_venta, 0) - ISNULL(b.total_costo, 0) AS margen_bruto,
    CONVERT(DECIMAL(12,2),
        ISNULL(gp.total_gasto_periodo, 0) * ISNULL(p.pct, 0)
    ) AS gastos_asignados,
    CONVERT(DECIMAL(12,2),
        (ISNULL(b.total_venta, 0) - ISNULL(b.total_costo, 0))
        - (ISNULL(gp.total_gasto_periodo, 0) * ISNULL(p.pct, 0))
    ) AS margen_neto,
    ds.dso_dias_prom
FROM meses m
LEFT JOIN base b
  ON b.anio = m.anio AND b.mes = m.mes
LEFT JOIN proporcion p
  ON p.anio = b.anio AND p.mes = b.mes
 AND p.id_tipo_cliente      = b.id_tipo_cliente
 AND p.id_tipo_transaccion  = b.id_tipo_transaccion
 AND p.id_categoria_producto= b.id_categoria_producto
LEFT JOIN gastos_periodo gp
  ON gp.anio = m.anio AND gp.mes = m.mes
LEFT JOIN dso_segmento ds
  ON ds.anio = b.anio AND ds.mes = b.mes
 AND ds.id_tipo_cliente      = b.id_tipo_cliente
 AND ds.id_tipo_transaccion  = b.id_tipo_transaccion
 AND ds.id_categoria_producto= b.id_categoria_producto
LEFT JOIN dbo.tipo_clientes tc       ON tc.id_tipo_cliente = b.id_tipo_cliente
LEFT JOIN dbo.tipo_transacciones tt  ON tt.id_tipo_transaccion = b.id_tipo_transaccion
LEFT JOIN dbo.categoria_productos cp ON cp.id_categoria = b.id_categoria_producto;
GO
