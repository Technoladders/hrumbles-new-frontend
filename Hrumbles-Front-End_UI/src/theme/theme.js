// import { extendTheme } from "@chakra-ui/react";

// const theme = extendTheme({
//   breakpoints: {
//     base: "0em",   // Mobile
//     sm: "30em",    // Tablets (480px)
//     md: "48em",    // Small laptops (768px)
//     lg: "62em",    // Desktops (992px)
//     xl: "80em",    // Large Screens (1280px)
//     "2xl": "96em", // Extra Large Screens (1536px)
//   },

//   styles: {
//     global: {
//       "html, body": {
//         bg: "base.bglight",
//         color: "black",
//       },
//       "*::placeholder": {
//         color: "gray.500",
//       },
//     },
//   },
  
//   colors: {
//     base: {
//       primary1: " #7B43F1",
//       primary2: " #602EEF",
//       secondary: " #F30CBF",
//       greylg: " #878787",
//       greydk: " #505050",
//       bglight: " #FCFBFE",
//       bgdark: " #1F1F1F",
//       sidebar: " #F6F6FC",
//     },
//     box: {
//       bgboxdark: " #292929",
//       bgboxlight: " #FCFBFE",
//     },
//     brand: {
//       primary: "linear-gradient(135deg, #7B43F1, #9B6DF5, #C89BFF)",
//       secondary: " #3B3B3B",
//       grey: " #8c8c8c",
//       hover: " #602EEF",
//       bg: " #0C7790",
//       cardTitle: " #0A5061",
//       activeBg: "linear-gradient(135deg, #C89BFF,rgb(205, 196, 223),rgb(231, 224, 240))",
//       secondaryBg: " #505050",
//       liteGrey: " #808080",
//       dividerGrey: " #E2E2E2",
//       searchbg: " #D9D9D9",
//     },
//   },
//   fonts: {
//     heading: "'Readex Pro', sans-serif",
//     body: "'Readex Pro', sans-serif",
//   },
// });

// export default theme;



import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  breakpoints: {
    base: "0em",
    sm: "30em",
    md: "48em",
    lg: "62em",
    xl: "80em",
    "2xl": "96em",
  },

  styles: {
    global: (props) => ({
      "html, body": {
        bg: props.colorMode === "dark" ? "base.bgdark" : "base.bglight",
        color: props.colorMode === "dark" ? "white" : "black",
        fontFamily: "body",
        // fontSize: "14px",
        lineHeight: "1.5",
      },
      "*::placeholder": {
        color: "gray.500",
      },
    }),
  },
  
  colors: {
    base: {
      primary1: " #7B43F1",
      primary2: " #602EEF",
      secondary: " #F30CBF",
      greylg: " #878787",
      greydk: " #505050",
      bglight: " #FCFBFE",
      bgdark: " black",
      sidebar: " #F6F6FC",
    },
    box: {
      bgboxdark: " #292929",
      bgboxlight: " #FCFBFE",
    },
    brand: {
      primary: "linear-gradient(135deg, #7B43F1, #9B6DF5, #C89BFF)",
      secondary: "#3B3B3B",
      grey: "#8c8c8c",
      hover: "#602EEF",
      bg: "#0C7790",
      cardTitle: "#0A5061",
      activeBg: "linear-gradient(135deg, #C89BFF,rgb(205, 196, 223),rgb(231, 224, 240))",
      secondaryBg: "#505050",
      liteGrey: "#808080",
      dividerGrey: "#E2E2E2",
      searchbg: "#D9D9D9",
    },
  },
  fonts: {
    heading: "'Readex Pro', sans-serif",
    body: "'Readex Pro', sans-serif",
  },
  textStyles: {
    h1: { fontSize: "2xl", fontWeight: "bold" },
    h2: { fontSize: "xl", fontWeight: "semibold" },
    h3: { fontSize: "lg", fontWeight: "medium" },
    h4: { fontSize: "md", fontWeight: "medium" },
    h5: { fontSize: "sm", fontWeight: "normal" },
    h6: { fontSize: "xs", fontWeight: "normal" },
    body: { fontSize: "md", fontWeight: "normal" },
    small: { fontSize: "sm", fontWeight: "light" },
  },
});

export default theme;