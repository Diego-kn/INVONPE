"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Shirt, Package, FileText, CheckCircle2, AlertCircle, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import * as XLSX from 'xlsx';
import Image from "next/image";

const CARGOS = [
  "JEFE DE ODPE",
  "CAODPE",
  "LOGISTICO",
  "ANALISTA DE RECURSOS HUMANOS",
  "AUXILIAR DE RRHH T1",
  "AUXILIAR DE RRHH T2",
  "COORDINADOR DE CAPACITACION",
  "COORDINADOR DE COMUNICACIONES",
  "AUXILIAR TECNICO DIURNO",
  "AUXILIAR TECNICO NOCTURNO",
  "ASISTENTE DE FINANZAS",
  "ASISTENTE LEGAL",
  "ASISTENTE EN AUDITORIA",
  "COORDINADOR DE OPERACIONES",
  "ASISTENTE OFICINA T1",
  "ASISTENTE DE OFICINA T2",
  "AUXILIAR ADMINISTRATIVO T1",
  "AUXILIAR ADMINISTRATIVO T2",
  "AUXILIAR DE OPERACIONES T1",
  "AUXILIAR LOGISTICO T1",
  "COORDINADOR DISTRITAL G1",
  "CAPACITADOR",
  "COORDINADOR DE LOCAL DE VOTACION",
  "COORDINADOR DE MESA",
  "RESPONSABLE DE CENTRO DE ACOPIO",
  "AUXILIAR DE CENTRO DE ACOPIO",
  "ORIENTADOR",
  "AUXILIAR DE REPLIEGUE DE ACTAS",
  "ENCARGADO DE CENTRO DE COMPUTO DESCENTRALIZADO",
  "ASISTENTE DE CENTRO DE COMPUTO DESCENTRALIZADO",
  "OPERADOR DE COMPUTO",
  "AUXILIAR DE CENTRO DE COMPUTO",
  "RESPONSABLE DE LINEA DE RECEPCION",
  "OPERADOR DE LINEA DE RECEPCION",
];

const TALLAS = ["XS", "S", "M", "L", "XL", "XXL"];

export default function App() {
  const [modulo, setModulo] = useState("entregas");

  // Estado para controlar el desplegable de registro de entrega
const [mostrarFormulario, setMostrarFormulario] = useState(false);

// Nuevos estados para filtros de reportes
const [filtroPrenda, setFiltroPrenda] = useState("");
const [filtroTalla, setFiltroTalla] = useState("");

  // Estado para sistema de Notificaciones con Diseño
  const [notificacion, setNotificacion] = useState({
    visible: false,
    mensaje: "",
    tipo: "exito" // 'exito' | 'error'
  });

  const mostrarNotificacion = (mensaje, tipo = "exito") => {
    setNotificacion({ visible: true, mensaje, tipo });
    setTimeout(() => {
      setNotificacion(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  // Inventario
  const [inventarioChalecos, setInventarioChalecos] = useState(
    TALLAS.reduce((acc, talla) => ({ ...acc, [talla]: 0 }), {})
  );
  const [inventarioPolos, setInventarioPolos] = useState(
    TALLAS.reduce((acc, talla) => ({ ...acc, [talla]: 0 }), {})
  );

  // Formulario para añadir inventario
  const [invProducto, setInvProducto] = useState("chaleco");
  const [invTalla, setInvTalla] = useState("M");
  const [invCantidad, setInvCantidad] = useState(1);

  // Personal
  const [personal, setPersonal] = useState([]);
  const [textoPersonal, setTextoPersonal] = useState("");
  const [cargoSeleccionado, setCargoSeleccionado] = useState("");
  const [busquedaCargo, setBusquedaCargo] = useState("");

  // Entregas
  const [entregas, setEntregas] = useState([]);
  const [personaSeleccionada, setPersonaSeleccionada] = useState("");
  const [tipoPrenda, setTipoPrenda] = useState("chaleco");
  const [tallaSeleccionada, setTallaSeleccionada] = useState("M");
  const [busquedaPersona, setBusquedaPersona] = useState("");

  // Filtros de Reporte
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
  const [filtroCargo, setFiltroCargo] = useState("");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");

  const cargarDatos = async () => {
    const [
      { data: datosPersonal, error: errorPersonal },
      { data: datosInventario, error: errorInventario },
      { data: datosEntregas, error: errorEntregas }
    ] = await Promise.all([
      supabase.from("personal").select("*").order("nombre"),
      supabase.from("inventario").select("*"),
      supabase
        .from("entregas")
        .select(`
          id,
          producto,
          talla,
          entregado_en,
          personal (
            nombre,
            dni,
            cargo
          )
        `)
        .order("entregado_en", { ascending: false })
    ]);

    if (errorPersonal || errorInventario || errorEntregas) {
      console.error(errorPersonal || errorInventario || errorEntregas);
      mostrarNotificacion("No se pudo conectar con la base de datos.", "error");
      return;
    }

    setPersonal(datosPersonal || []);
    setInventarioChalecos(
      TALLAS.reduce((resultado, talla) => {
        const fila = datosInventario?.find(
          item => item.producto === "chaleco" && item.talla === talla
        );
        resultado[talla] = fila?.stock ?? 0;
        return resultado;
      }, {})
    );

    setInventarioPolos(
      TALLAS.reduce((resultado, talla) => {
        const fila = datosInventario?.find(
          item => item.producto === "polo" && item.talla === talla
        );
        resultado[talla] = fila?.stock ?? 0;
        return resultado;
      }, {})
    );

    setEntregas(
      (datosEntregas || []).map(entrega => ({
        id: entrega.id,
        persona: entrega.personal?.nombre || "Sin nombre",
        dni: entrega.personal?.dni || "-",
        cargo: entrega.personal?.cargo || "-",
        tipo: entrega.producto,
        talla: entrega.talla,
        fechaRaw: entrega.entregado_en,
        fecha: new Date(entrega.entregado_en).toLocaleString("es-PE")
      }))
    );
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Sumar stock
  const agregarStock = async () => {
    const cantidadASumar = Math.max(1, Number(invCantidad) || 0);
    const stockActual = invProducto === "chaleco" 
      ? inventarioChalecos[invTalla] 
      : inventarioPolos[invTalla];

    const nuevoStock = stockActual + cantidadASumar;

    const { error } = await supabase
      .from("inventario")
      .update({
        stock: nuevoStock,
        actualizado_en: new Date().toISOString()
      })
      .eq("producto", invProducto)
      .eq("talla", invTalla);

    if (error) {
      mostrarNotificacion("No se pudo actualizar el inventario: " + error.message, "error");
      return;
    }

    mostrarNotificacion(`Se ingresaron +${cantidadASumar} unidades a ${invProducto.toUpperCase()} (${invTalla})`);
    setInvCantidad(1);
    await cargarDatos();
  };

  // Procesar texto de personal
  const procesarPersonal = async () => {
    if (!cargoSeleccionado) {
      mostrarNotificacion("Primero seleccione un cargo.", "error");
      return;
    }

    const lineas = textoPersonal.trim().split("\n").filter(linea => linea.trim());
    const nuevos = [];

    for (const linea of lineas) {
      const partes = linea.trim().split(/\s+/);
      const dni = partes.find(item => /^\d{8}$/.test(item));
      const celular = partes.find(item => /^\d{9}$/.test(item));
      const nombre = partes
        .filter(item => !/^\d{8}$/.test(item) && !/^\d{9}$/.test(item))
        .join(" ");

      if (nombre && dni && celular) {
        nuevos.push({ nombre, dni, celular, cargo: cargoSeleccionado });
      }
    }

    if (nuevos.length === 0) {
      mostrarNotificacion("No se encontraron registros válidos.", "error");
      return;
    }

    const { error } = await supabase.from("personal").upsert(nuevos, { onConflict: "dni" });

    if (error) {
      mostrarNotificacion("No se pudo guardar el personal: " + error.message, "error");
      return;
    }

    mostrarNotificacion(`${nuevos.length} persona(s) registrada(s) correctamente.`);
    setTextoPersonal("");
    await cargarDatos();
  };

  // Filtrar cargos y personas
  const cargosFiltrados = useMemo(() => {
    if (!busquedaCargo) return CARGOS;
    return CARGOS.filter(c => c.toLowerCase().includes(busquedaCargo.toLowerCase()));
  }, [busquedaCargo]);

  const personasFiltradas = useMemo(() => {
    if (!busquedaPersona) return personal;
    return personal.filter(p => 
      p.nombre.toLowerCase().includes(busquedaPersona.toLowerCase()) ||
      p.dni.includes(busquedaPersona)
    );
  }, [busquedaPersona, personal]);

  // Filtrar Entregas
  const entregasFiltradas = useMemo(() => {
    return entregas.filter(item => {
      const coincideBusqueda = 
        !filtroBusqueda ||
        item.persona.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
        item.dni.includes(filtroBusqueda);

      const coincideCargo = !filtroCargo || item.cargo === filtroCargo;
      const coincidePrenda = !filtroPrenda || item.tipo === filtroPrenda;
      const coincideTalla = !filtroTalla || item.talla === filtroTalla;

      let coincideFecha = true;
      const fechaEntrega = item.fechaRaw ? new Date(item.fechaRaw) : null;

      if (filtroFechaDesde && fechaEntrega) {
        const desde = new Date(filtroFechaDesde + "T00:00:00");
        if (fechaEntrega < desde) coincideFecha = false;
      }

      if (filtroFechaHasta && fechaEntrega) {
        const hasta = new Date(filtroFechaHasta + "T23:59:59");
        if (fechaEntrega > hasta) coincideFecha = false;
      }

      return coincideBusqueda && coincideCargo && coincidePrenda && coincideTalla && coincideFecha;
    });
  }, [entregas, filtroBusqueda, filtroCargo, filtroPrenda, filtroTalla, filtroFechaDesde, filtroFechaHasta]);

  const descargarExcel = () => {
  if (entregasFiltradas.length === 0) {
    alert("No hay datos para exportar con los filtros seleccionados.");
    return;
  }

  // 1. Mapear y dar formato a las filas
  const datosFormateados = entregasFiltradas.map((e, index) => ({
    "N°": index + 1,
    "Fecha de Entrega": e.fecha,
    "DNI": e.dni,
    "Nombres y Apellidos": e.persona,
    "Cargo / Área": e.cargo,
    "Tipo de Prenda": e.tipo.toUpperCase(),
    "Talla": e.talla,
  }));

  // 2. Crear la hoja de trabajo a partir de los datos
  const worksheet = XLSX.utils.json_to_sheet(datosFormateados);

  // 3. Configurar anchos de columnas de manera proporcionada
  const columnWidths = [
    { wch: 6 },  // N°
    { wch: 18 }, // Fecha
    { wch: 12 }, // DNI
    { wch: 32 }, // Persona
    { wch: 22 }, // Cargo
    { wch: 16 }, // Prenda
    { wch: 10 }, // Talla
  ];
  worksheet["!cols"] = columnWidths;

  // 4. Crear el libro de trabajo y añadir la hoja
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte de Entregas");

  // 5. Generar la fecha actual para el nombre del archivo
  const fechaHoy = new Date().toISOString().split("T")[0];

  // 6. Descargar el archivo
  XLSX.writeFile(workbook, `Reporte_Entregas_${fechaHoy}.xlsx`);
};

  // Registrar entrega
  const registrarEntrega = async () => {
    if (!personaSeleccionada || !tallaSeleccionada) {
      mostrarNotificacion("Seleccione una persona y una talla.", "error");
      return;
    }

    const { error } = await supabase.rpc("registrar_entrega_prenda", {
      p_personal_id: personaSeleccionada,
      p_producto: tipoPrenda,
      p_talla: tallaSeleccionada
    });

    if (error) {
      mostrarNotificacion(error.message, "error");
      return;
    }

    mostrarNotificacion("Entrega registrada exitosamente.");
    setPersonaSeleccionada("");
    setTallaSeleccionada("M");
    await cargarDatos();
  };

  return (
    <div className="min-h-screen bg-gray-50 relative">
      
      {/* Componente Toast de Notificación con Diseño */}
      {notificacion.visible && (
        <div className="fixed top-5 right-5 z-50 animate-bounce">
          <div
            className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border ${
              notificacion.tipo === "exito"
                ? "bg-emerald-600 text-white border-emerald-500"
                : "bg-red-600 text-white border-red-500"
            }`}
          >
            {notificacion.tipo === "exito" ? (
              <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-emerald-200" />
            ) : (
              <AlertCircle className="w-6 h-6 flex-shrink-0 text-red-200" />
            )}
            <p className="font-medium text-sm">{notificacion.mensaje}</p>
            <button
              onClick={() => setNotificacion(prev => ({ ...prev, visible: false }))}
              className="ml-auto text-white/80 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-blue-950 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold text-center">
          CONTROL DE INDUMENTARIA
        </h1>
      </header>

      <div className="flex items-center gap-3">
      <Image 
        src="/logo.png" 
        alt="Logo INVONPE" 
        width={40} 
        height={40} 
        className="object-contain"
      />
      <h1 className="text-xl font-bold text-gray-800">INVONPE</h1>
    </div>

      {/* Navegación */}
      <nav className="bg-white shadow-md p-4">
        <div className="max-w-6xl mx-auto flex gap-4 flex-wrap justify-center">
          <button
            onClick={() => setModulo("entregas")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition ${
              modulo === "entregas" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Shirt size={20} />
            Entregas
          </button>
          <button
            onClick={() => setModulo("inventario")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition ${
              modulo === "inventario" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Package size={20} />
            Inventario
          </button>
          <button
            onClick={() => setModulo("personal")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition ${
              modulo === "personal" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Users size={20} />
            Personal
          </button>
          <button
            onClick={() => setModulo("reportes")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition ${
              modulo === "reportes" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <FileText size={20} />
            Reportes
          </button>
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="max-w-6xl mx-auto p-4">

        {/* 1. Módulo Entregas */}
        {modulo === "entregas" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Control de Entregas</h2>
            <button
              onClick={() => setMostrarFormulario(!mostrarFormulario)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 transform active:scale-95"
            >
              <Shirt className="w-5 h-5" />
              {mostrarFormulario ? "Ocultar Formulario" : "Comenzar Nueva Entrega"}
            </button>
          </div>

          {/* Formulario desplegable con animación de transición */}
          <div
            className={`transition-all duration-500 ease-in-out overflow-hidden transform origin-top ${
              mostrarFormulario
                ? "max-h-[800px] opacity-100 scale-y-100 mb-6"
                : "max-h-0 opacity-0 scale-y-95 pointer-events-none"
            }`}
          >
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">
                Registrar nueva entrega
              </h3>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Buscar persona:
                  </label>
                  <input
                    type="text"
                    value={busquedaPersona}
                    onChange={(e) => setBusquedaPersona(e.target.value)}
                    placeholder="Nombre o DNI..."
                    className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                  />
                  <select
                    value={personaSeleccionada}
                    onChange={(e) => setPersonaSeleccionada(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 mt-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                  >
                    <option value="">-- Seleccione persona --</option>
                    {personasFiltradas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.dni}) - {p.cargo}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Tipo de prenda:
                    </label>
                    <select
                      value={tipoPrenda}
                      onChange={(e) => setTipoPrenda(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                    >
                      <option value="chaleco">Chaleco</option>
                      <option value="polo">Polo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Talla:
                    </label>
                    <select
                      value={tallaSeleccionada}
                      onChange={(e) => setTallaSeleccionada(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                    >
                      {TALLAS.map((talla) => (
                        <option key={talla} value={talla}>
                          {talla} - Stock:{" "}
                          {tipoPrenda === "chaleco"
                            ? inventarioChalecos[talla]
                            : inventarioPolos[talla]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={registrarEntrega}
                className="mt-6 bg-emerald-600 text-white px-8 py-3 rounded-xl hover:bg-emerald-700 transition-all w-full md:w-auto font-semibold shadow-lg hover:shadow-emerald-600/30"
              >
                Guardar Entrega
              </button>
            </div>
          </div>

          {/* Tabla de Entregas con Diseño Estilizado */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Historial de entregas ({entregas.length})
            </h3>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-xs border-b border-gray-200">
                  <tr>
                    <th className="py-3.5 px-4">Fecha</th>
                    <th className="py-3.5 px-4">Persona</th>
                    <th className="py-3.5 px-4">DNI</th>
                    <th className="py-3.5 px-4">Prenda</th>
                    <th className="py-3.5 px-4">Talla</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {entregas.map((e) => (
                    <tr key={e.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs">{e.fecha}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{e.persona}</td>
                      <td className="py-3 px-4 font-mono">{e.dni}</td>
                      <td className="py-3 px-4 capitalize">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          e.tipo === "chaleco" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {e.tipo}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold">{e.talla}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

        {/* 2. Módulo Inventario */}
        {modulo === "inventario" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Gestión de Inventario</h2>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
              <h3 className="text-lg font-semibold mb-2">Registrar ingreso de nuevo paquete</h3>
              <p className="text-sm text-gray-600 mb-4">Selecciona el producto, la talla e ingresa la cantidad recibida para sumarla al stock actual.</p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prenda:</label>
                  <select
                    value={invProducto}
                    onChange={(e) => setInvProducto(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="chaleco">Chaleco</option>
                    <option value="polo">Polo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Talla:</label>
                  <select
                    value={invTalla}
                    onChange={(e) => setInvTalla(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none"
                  >
                    {TALLAS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad a ingresar:</label>
                  <input
                    type="number"
                    min="1"
                    value={invCantidad}
                    onChange={(e) => setInvCantidad(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={agregarStock}
                  className="bg-blue-600 text-white font-medium p-2 rounded-lg hover:bg-blue-700 transition shadow"
                >
                  Registrar
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span> Chalecos
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {TALLAS.map(talla => (
                    <div key={talla} className="p-3 bg-blue-50 rounded-lg text-center">
                      <span className="block font-bold text-gray-600">{talla}</span>
                      <span className="text-2xl font-black text-blue-700">{inventarioChalecos[talla]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full"></span> Polos
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {TALLAS.map(talla => (
                    <div key={talla} className="p-3 bg-emerald-50 rounded-lg text-center">
                      <span className="block font-bold text-gray-600">{talla}</span>
                      <span className="text-2xl font-black text-emerald-700">{inventarioPolos[talla]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gray-100 rounded-lg p-4 text-center text-sm font-semibold text-gray-700">
              Total Chalecos: {Object.values(inventarioChalecos).reduce((a, b) => a + b, 0)} | Total Polos: {Object.values(inventarioPolos).reduce((a, b) => a + b, 0)}
            </div>
          </div>
        )}

        {/* 3. Módulo Personal */}
        {modulo === "personal" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Registro de Personal</h2>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Cargar personal desde texto</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar cargo para este lote:</label>
                <input
                  type="text"
                  value={busquedaCargo}
                  onChange={(e) => setBusquedaCargo(e.target.value)}
                  placeholder="Buscar cargo..."
                  className="w-full border-2 border-gray-300 rounded-lg p-2 mb-2 focus:border-blue-500 focus:outline-none"
                />
                <select
                  value={cargoSeleccionado}
                  onChange={(e) => setCargoSeleccionado(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Seleccione un cargo --</option>
                  {cargosFiltrados.map(cargo => (
                    <option key={cargo} value={cargo}>{cargo}</option>
                  ))}
                </select>
              </div>

              <textarea
                value={textoPersonal}
                onChange={(e) => setTextoPersonal(e.target.value)}
                placeholder="Ejemplo:
RIXE TARAZONA JOSE  20017031    949631751"
                className="w-full h-40 border-2 border-gray-300 rounded-lg p-3 font-mono text-sm focus:border-blue-500 focus:outline-none"
              />
              
              <button
                onClick={procesarPersonal}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition shadow"
              >
                Procesar y Agregar
              </button>
            </div>

            {personal.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Personal registrado ({personal.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">Nombre</th>
                        <th className="p-2 text-left">DNI</th>
                        <th className="p-2 text-left">Celular</th>
                        <th className="p-2 text-left">Cargo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {personal.map((p, i) => (
                        <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="p-2">{p.nombre}</td>
                          <td className="p-2">{p.dni}</td>
                          <td className="p-2">{p.celular}</td>
                          <td className="p-2">{p.cargo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Módulo Reportes */}
        {modulo === "reportes" && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-800">Reporte de Entregas</h2>

          {/* Filtros Mejorados */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">
              Filtros de búsqueda avanzada
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Buscar Persona / DNI
                </label>
                <input
                  type="text"
                  value={filtroBusqueda}
                  onChange={(e) => setFiltroBusqueda(e.target.value)}
                  placeholder="Nombre o DNI..."
                  className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Cargo</label>
                <select
                  value={filtroCargo}
                  onChange={(e) => setFiltroCargo(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-sm transition-all"
                >
                  <option value="">Todos</option>
                  {CARGOS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Prenda</label>
                <select
                  value={filtroPrenda}
                  onChange={(e) => setFiltroPrenda(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-sm transition-all"
                >
                  <option value="">Todas</option>
                  <option value="chaleco">Chaleco</option>
                  <option value="polo">Polo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Talla</label>
                <select
                  value={filtroTalla}
                  onChange={(e) => setFiltroTalla(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-sm transition-all"
                >
                  <option value="">Todas</option>
                  {TALLAS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Desde</label>
                <input
                  type="date"
                  value={filtroFechaDesde}
                  onChange={(e) => setFiltroFechaDesde(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Hasta</label>
                <input
                  type="date"
                  value={filtroFechaHasta}
                  onChange={(e) => setFiltroFechaHasta(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-sm transition-all"
                />
              </div>
            </div>

            {(filtroBusqueda || filtroCargo || filtroPrenda || filtroTalla || filtroFechaDesde || filtroFechaHasta) && (
              <button
                onClick={() => {
                  setFiltroBusqueda("");
                  setFiltroCargo("");
                  setFiltroPrenda("");
                  setFiltroTalla("");
                  setFiltroFechaDesde("");
                  setFiltroFechaHasta("");
                }}
                className="mt-4 text-xs font-semibold text-red-600 hover:text-red-700 underline transition-colors"
              >
                Limpiar todos los filtros
              </button>
            )}
          </div>

          {/* Resultados del Reporte */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                Resultados ({entregasFiltradas.length})
              </h3>

              {/* Botón de Exportar a Excel */}
              <button
                onClick={descargarExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2 transform active:scale-95"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Exportar a Excel (.xlsx)
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-xs border-b border-gray-200">
                  <tr>
                    <th className="py-3.5 px-4">Fecha</th>
                    <th className="py-3.5 px-4">Persona</th>
                    <th className="py-3.5 px-4">DNI</th>
                    <th className="py-3.5 px-4">Cargo</th>
                    <th className="py-3.5 px-4">Prenda</th>
                    <th className="py-3.5 px-4">Talla</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {entregasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-gray-400 font-medium">
                        No se encontraron entregas que coincidan con los filtros.
                      </td>
                    </tr>
                  ) : (
                    entregasFiltradas.map((e) => (
                      <tr key={e.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs">{e.fecha}</td>
                        <td className="py-3 px-4 font-medium text-gray-900">{e.persona}</td>
                        <td className="py-3 px-4 font-mono">{e.dni}</td>
                        <td className="py-3 px-4 text-xs text-gray-500 font-semibold">{e.cargo}</td>
                        <td className="py-3 px-4 capitalize">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            e.tipo === "chaleco" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {e.tipo}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold">{e.talla}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      </main>
    </div>
  );
}