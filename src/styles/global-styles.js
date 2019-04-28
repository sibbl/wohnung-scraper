import { createGlobalStyle } from "styled-components";

const GlobalStyles = createGlobalStyle`
* {
    box-sizing: border-box;
}
html, body {
    padding: 0;
    margin: 0;
    width: 100%;
    height: 100%;
}
body {
    font-family: 'Open Sans', Arial, Helvetica, sans-serif;
    font-size: 14px;
}
#root {
    height: 100%;
}`;

export default GlobalStyles;