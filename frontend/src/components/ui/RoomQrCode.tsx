// frontend/src/components/ui/RoomQrCode.tsx
// Cartão de QR Code nítido (zona quieta branca obrigatória) para projeção em sala de aula.

import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ThemePalette } from "../../constants/duoTheme";
import { generateQrMatrix } from "../../utils/qrMatrix";

export interface RoomQrCodeProps {
  value: string;
  caption?: string;
  size?: number;
  palette: ThemePalette;
}

export function RoomQrCode({
  value,
  caption,
  size = 188,
  palette,
}: RoomQrCodeProps) {
  const matrix = useMemo(() => generateQrMatrix(value), [value]);

  if (!matrix) {
    return null;
  }

  const modules = matrix.length;
  const cellSize = Math.max(3, Math.floor(size / modules));
  const exactGridSize = cellSize * modules;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.cardBg,
          borderColor: palette.secondaryBorder,
        },
      ]}
      accessible
      accessibilityLabel={`QR Code de convite para ${value}`}
    >
      <View style={styles.quietZone}>
        <View style={{ width: exactGridSize, height: exactGridSize }}>
          {matrix.map((row, r) => (
            <View key={`qr-r-${r}`} style={styles.row}>
              {row.map((isDark, c) => (
                <View
                  key={`qr-c-${c}`}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: isDark ? "#111827" : "#FFFFFF",
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
      {caption ? (
        <Text style={[styles.caption, { color: palette.textMuted }]}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 5,
    padding: 14,
    gap: 10,
  },
  quietZone: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  row: {
    flexDirection: "row",
  },
  caption: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 17,
  },
});
