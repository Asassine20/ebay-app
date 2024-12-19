import React, { useEffect, useState } from "react";
import ReactModal from "react-modal";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";

interface VariationModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  selectedItemId: string | null;
}

interface Variation {
  picture_url: string;
  name: string;
  price: number;
  quantity: number;
  recent_sales: number;
}

export default function VariationModal({
  isOpen,
  onRequestClose,
  selectedItemId,
}: VariationModalProps) {
  const [variations, setVariations] = useState<Variation[]>([]);
  const [itemName, setItemName] = useState<string | null>(null); // State for item name
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (isOpen && selectedItemId) {
      fetchVariations(page);
    }
  }, [isOpen, selectedItemId, page]);

  const fetchVariations = async (currentPage: number) => {
    if (!selectedItemId) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/get-variations?itemId=${selectedItemId}&page=${currentPage}&entriesPerPage=10`
      );
      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error details:", errorData);
        throw new Error(`API error: ${response.status} - ${errorData.message}`);
      }
      const { itemName, data, totalPages } = await response.json(); // Adjust based on API response
      setItemName(itemName); // Set the item name
      setVariations(data);
      setTotalPages(totalPages);
    } catch (error) {
      console.error("Error fetching variations:", error);
    } finally {
      setLoading(false);
    }
  };

  const columnDefs = [
    {
      headerName: "Image",
      field: "picture_url",
      width: 100,
      cellRenderer: (params: any) =>
        params.value ? (
          <img
            src={params.value}
            alt="Variation"
            style={{ width: "80px", height: "auto", objectFit: "cover" }}
          />
        ) : (
          "N/A"
        ),
    },
    {
      headerName: "Name",
      field: "name",
      width: 300,
      cellStyle: {
        whiteSpace: "normal",
        lineHeight: "1.4",
      },
    },
    {
      headerName: "Price",
      field: "price",
      width: 80,
      valueFormatter: ({ value }: any) =>
        typeof value === "number" ? `$${value.toFixed(2)}` : "N/A",
    },
    {
      headerName: "Quantity Available",
      field: "quantity",
      width: 100,
    },
    {
      headerName: "Sales (Last 30 Days)",
      field: "recent_sales",
      width: 150,
    },
  ];

  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Variations Modal"
      ariaHideApp={false}
      style={{
        content: {
          width: "80%",
          margin: "auto",
          height: "70%",
          backgroundColor: "#1e1e1e",
          color: "#fff",
          overflow: "hidden",
        },
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          zIndex: 1000,
        },
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">
          Variations for Item: {itemName || "Loading..."}
        </h2>
        <button
          onClick={onRequestClose}
          className="text-red-500 text-2xl font-bold hover:text-red-700"
          aria-label="Close"
        >
          &times;
        </button>
      </div>
      {loading ? (
        <p className="text-center">Loading...</p>
      ) : variations.length > 0 ? (
        <>
          <div
            className="ag-theme-alpine-dark"
            style={{
              height: "500px",
              width: "100%",
            }}
          >
            <AgGridReact
              columnDefs={columnDefs}
              rowData={variations}
              defaultColDef={{
                sortable: true,
                filter: true,
                autoHeaderHeight: true,
                wrapHeaderText: true,
                resizable: true,
                flex: 1,
              }}
              domLayout="autoHeight"
              pagination={true}
              paginationPageSize={10}
              rowHeight={100}
            />
          </div>
          <div className="mt-4 flex justify-center">
            <button
              className="px-4 py-2 mx-2 bg-gray-300 rounded text-black"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span className="px-4 py-2">{`Page ${page} of ${totalPages}`}</span>
            <button
              className="px-4 py-2 mx-2 bg-gray-300 rounded text-black"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <p className="text-center">No variations found for this item.</p>
      )}
    </ReactModal>
  );
}
