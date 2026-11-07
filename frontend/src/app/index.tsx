import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
} from "react-native";
import io, { Socket } from "socket.io-client";

// AVISO: Substitua "SEU_IP_LOCAL" pelo IP da sua máquina na rede Wi-Fi (ex: 192.168.1.5)
const SERVER_URL = "http://192.168.0.2:3000";

export default function IndexScreen() {
  const socketRef = useRef<Socket | null>(null);

  // Estados da Interface
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [playerCount, setPlayerCount] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Novo estado: Guarda a condição sorteada para o utilizador atual
  const [myCondition, setMyCondition] = useState<string | null>(null);

  useEffect(() => {
    socketRef.current = io(SERVER_URL);
    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Ligado ao servidor com sucesso! ID:", socket.id);
    });

    socket.on("room_created", ({ roomCode, playerCount }) => {
      setRoomCode(roomCode);
      setPlayerCount(playerCount);
      setIsInRoom(true);
      setErrorMsg("");
    });

    socket.on("room_joined", ({ roomCode, playerCount }) => {
      setRoomCode(roomCode);
      setPlayerCount(playerCount);
      setIsInRoom(true);
      setErrorMsg("");
    });

    socket.on("room_updated", ({ playerCount }) => {
      setPlayerCount(playerCount);
    });

    // Novo evento: Recebe o mapeamento e descobre a condição local
    socket.on("game_started", ({ gameState }) => {
      setIsReady(true);
      console.log("O jogo vai começar! Mapeamento:", gameState);

      if (socket.id && gameState[socket.id]) {
        setMyCondition(gameState[socket.id]);
      }
    });

    socket.on("room_error", ({ message }) => {
      setErrorMsg(message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleCreateRoom = () => {
    setErrorMsg("");
    socketRef.current?.emit("create_room");
  };

  const handleJoinRoom = () => {
    if (inputCode.trim().length > 0) {
      setErrorMsg("");
      socketRef.current?.emit("join_room", {
        roomCode: inputCode.trim().toUpperCase(),
      });
    } else {
      setErrorMsg("Por favor, digite um código válido.");
    }
  };

  // TELA DE ESPERA (DENTRO DA SALA)
  if (isInRoom) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Sala: {roomCode}</Text>
        <Text style={styles.subtitle}>Jogadores: {playerCount} / 4</Text>

        {isReady && myCondition ? (
          <View style={styles.readyContainer}>
            <Text style={styles.conditionLabel}>
              A sua condição no jogo será:
            </Text>
            <Text style={styles.conditionText}>
              {myCondition.toUpperCase()}
            </Text>
          </View>
        ) : (
          <Text style={styles.waitingText}>Aguardando outros jogadores...</Text>
        )}
      </View>
    );
  }

  // TELA INICIAL (LOBBY)
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ludo Equidade</Text>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleCreateRoom}>
        <Text style={styles.buttonText}>Criar Nova Sala</Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.orText}>OU</Text>
        <View style={styles.line} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Código da Sala (Ex: A1B2)"
        value={inputCode}
        onChangeText={(text) => setInputCode(text.toUpperCase())}
        maxLength={4}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      <TouchableOpacity style={styles.button} onPress={handleJoinRoom}>
        <Text style={styles.buttonText}>Entrar na Sala</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: "#555",
    marginBottom: 30,
  },
  input: {
    width: "100%",
    maxWidth: 300,
    height: 50,
    backgroundColor: "#FFF",
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 18,
    borderWidth: 1,
    borderColor: "#DDD",
    textAlign: "center",
    marginBottom: 15,
  },
  button: {
    width: "100%",
    maxWidth: 300,
    height: 50,
    backgroundColor: "#208AEF",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: 300,
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#CCC",
  },
  orText: {
    marginHorizontal: 10,
    color: "#999",
    fontWeight: "bold",
  },
  errorText: {
    color: "#D32F2F",
    marginBottom: 15,
    fontSize: 16,
    fontWeight: "500",
  },
  waitingText: {
    fontSize: 18,
    color: "#FF9800",
    marginTop: 20,
    fontWeight: "bold",
  },
  readyContainer: {
    marginTop: 20,
    padding: 25,
    backgroundColor: "#E8F5E9",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#4CAF50",
    width: "100%",
    maxWidth: 320,
  },
  conditionLabel: {
    fontSize: 18,
    color: "#2E7D32",
    marginBottom: 10,
    textAlign: "center",
  },
  conditionText: {
    fontSize: 32,
    color: "#1B5E20",
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1,
  },
});
