import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import io from "socket.io-client";

// AVISO IMPORTANTE: Coloque o IP local da sua máquina na sua rede Wi-Fi (ex: 192.168.1.5)
const socket = io("http://SEU_IP_LOCAL:3000");

export default function IndexScreen() {
  useEffect(() => {
    // Escuta o evento de ligação bem-sucedida
    socket.on("connect", () => {
      console.log("Ligado ao servidor com sucesso!");
    });

    // Limpa a ligação caso o componente seja desmontado
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ludo Equidade</Text>
      <Text>A aguardar ligação ao servidor...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
});
