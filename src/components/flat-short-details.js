import React from "react";

export const FlatShortDetails = ({ flat }) => {
  return (
    <div>
      <div>
        Free from:{" "}
        {flat.free_from ? new Date(flat.free_from).toLocaleDateString() : "-"}
      </div>
      <div>
        {flat.price || "-"} € | {flat.size || "-"} m² | {flat.rooms || "-"}{" "}
        rooms
      </div>
    </div>
  );
};
