import { StyleSheet, Platform, StatusBar } from "react-native"

// Paleta Hollow Knight mejorada y detalles visuales más elegantes
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#181c24",
  },
  header: {
    backgroundColor: "#232837",
    padding: 10, // Más pequeño
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 8 : 12, // Más pequeño
    borderBottomWidth: 2,
    borderBottomColor: "#3e4a5b",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  title: {
    fontSize: 22, // Más pequeño
    fontWeight: "bold",
    color: "#e5e6e8",
    letterSpacing: 2,
    textShadowColor: "#3e4a5b",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 13, // Más pequeño
    color: "#8fa1b3",
    marginTop: 4,
    fontStyle: "italic",
    letterSpacing: 1,
  },
  cameraView: {
    backgroundColor: "#181c24",
    width: "99%", // Más grande aún
    height: 520,  // Mucho más grande
    borderWidth: 2,
    borderColor: "#5c7fa3",
    borderRadius: 32,
    overflow: "hidden",
    alignSelf: "center",
    marginVertical: 20,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
  scanFrame: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 320, // Más grande
    height: 320, // Más grande
    marginTop: -160,
    marginLeft: -160,
    borderWidth: 2.5,
    borderColor: "#8fa1b3",
    borderRadius: 20,
    opacity: 0.8,
  },
  scanCorner: {
    position: "absolute",
    top: -2,
    left: -2,
    width: 32,
    height: 32,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderColor: "#e5e6e8",
    borderRadius: 8,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(24,28,36,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanText: {
    color: "#e5e6e8",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    letterSpacing: 1,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#232837",
    borderBottomWidth: 1,
    borderBottomColor: "#3e4a5b",
    borderRadius: 12,
    marginHorizontal: 8,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: "#3e4a5b",
    paddingVertical: 7, // Más pequeño
    paddingHorizontal: 4, // Más pequeño
    borderRadius: 10, // Un poco más pequeño
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38, // Más pequeño
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
  },
  syncButton: {
    backgroundColor: "#6bbf59",
  },
  clearButton: {
    backgroundColor: "#b94e4e",
  },
  buttonText: {
    color: "#e5e6e8",
    fontWeight: "bold",
    fontSize: 11, // Más pequeño
    marginTop: 1,
    letterSpacing: 1,
    textShadowColor: "#232837",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  listContainer: {
    flex: 1,
    backgroundColor: "#232837",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 8,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 2,
  },
  listTitle: {
    fontSize: 19,
    fontWeight: "bold",
    padding: 18,
    backgroundColor: "#232837",
    color: "#e5e6e8",
    borderBottomWidth: 1,
    borderBottomColor: "#3e4a5b",
    letterSpacing: 1,
    textAlign: "left",
  },
  listContent: {
    padding: 10,
  },
  itemContainer: {
    backgroundColor: "#3e4a5b",
    borderRadius: 12,
    marginVertical: 6,
    marginHorizontal: 8,
    flexDirection: "row",
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
  },
  itemContent: {
    flex: 1,
    padding: 14,
  },
  itemData: {
    fontSize: 15,
    fontWeight: "600",
    color: "#e5e6e8",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  itemType: {
    fontSize: 12,
    color: "#8fa1b3",
    marginBottom: 2,
    fontStyle: "italic",
  },
  itemTime: {
    fontSize: 11,
    color: "#8fa1b3",
  },
  itemActions: {
    flexDirection: "column",
  },
  copyButton: {
    backgroundColor: "#5c7fa3",
    justifyContent: "center",
    alignItems: "center",
    width: 54,
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#232837",
  },
  deleteButton: {
    backgroundColor: "#b94e4e",
    justifyContent: "center",
    alignItems: "center",
    width: 54,
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 17,
    color: "#8fa1b3",
    marginTop: 20,
    textAlign: "center",
    fontStyle: "italic",
    letterSpacing: 1,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#3e4a5b",
    marginTop: 8,
    textAlign: "center",
  },
})

export default styles