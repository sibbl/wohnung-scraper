import React from "react";
import styled from "styled-components";
import { FlatShortDetails } from "./flat-short-details";

const Title = styled.div`
  margin-bottom: 4px;
`;

export const SelectedFlatDetails = ({
  selectedFlat,
  setActiveFlat,
  setFavoriteFlat
}) => {
  return (
    <div>
      <Title>Selected Flat:</Title>
      <FlatShortDetails flat={selectedFlat} />
      <a href={selectedFlat.url}>Auf {selectedFlat.website} öffnen</a>
      {Object.entries(selectedFlat.data).map(([key, value]) => (
        <div key={key}>
          <span>{key}: </span>
          <span>{value}</span>
        </div>
      ))}
      <button
        onClick={() =>
          setActiveFlat({
            flat: selectedFlat,
            active: !selectedFlat.active
          })
        }
      >
        {selectedFlat.active ? "Deactivate" : "Activate"}
      </button>
      <button
        onClick={() =>
          setFavoriteFlat({
            flat: selectedFlat,
            favorite: !selectedFlat.favorite
          })
        }
      >
        {selectedFlat.favorite ? "Remove from" : "Add to"} favorites
      </button>
      <div>Added: {new Date(selectedFlat.added).toLocaleString()}</div>
    </div>
  );
};
