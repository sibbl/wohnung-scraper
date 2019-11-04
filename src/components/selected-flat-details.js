import React from "react";
import styled from "styled-components";
import { FlatShortDetails } from "./flat-short-details";

const StyledContainer = styled.div`
  margin-top: 12px;
`;

const Title = styled.div`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
`;

const StyledFlatShortDetails = styled(FlatShortDetails)`
  margin-bottom: 4px;
`;

const StyledLink = styled.a`
  padding: 8px 16px;
  margin: 8px 0;
  text-decoration: none;
  color: #fff;
  background: #3f51b5;
  border: 0;
  border-radius: 4px;
  display: inline-block;
  cursor: pointer;
  &:focus {
    outline: 0;
  }
  &:hover {
    background: #283593;
  }
`;

const StyledButton = styled.button`
  padding: 8px 16px;
  margin: 8px 0;
  & + & {
    margin-left: 12px;
  }
  background: #fff;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  display: inline-block;
  cursor: pointer;
  &:focus {
    outline: 0;
  }
  &:hover {
    background: #e0e0e0;
  }
`;

const StyledDiv = styled.div`
  font-size: 12px;
`;

export const SelectedFlatDetails = ({
  selectedFlat,
  setActiveFlat,
  setFavoriteFlat
}) => {
  return (
    <StyledContainer>
      <Title>Selected Flat:</Title>
      <StyledFlatShortDetails flat={selectedFlat} />
      <StyledLink href={selectedFlat.url} target="_blank">
        View on {selectedFlat.website}
      </StyledLink>
      {Object.entries(selectedFlat.data).map(([key, value]) => (
        <StyledDiv key={key}>
          <span>{key}: </span>
          <span>{value}</span>
        </StyledDiv>
      ))}
      <StyledButton
        onClick={() =>
          setActiveFlat({
            flatId: selectedFlat.id,
            active: !selectedFlat.active
          })
        }
      >
        {selectedFlat.active ? "Deactivate" : "Activate"}
      </StyledButton>
      <StyledButton
        onClick={() =>
          setFavoriteFlat({
            flatId: selectedFlat.id,
            favorite: !selectedFlat.favorite
          })
        }
      >
        {selectedFlat.favorite ? "Remove from" : "Add to"} favorites
      </StyledButton>
      <StyledDiv>
        Added: {new Date(selectedFlat.added).toLocaleString()}
      </StyledDiv>
    </StyledContainer>
  );
};
