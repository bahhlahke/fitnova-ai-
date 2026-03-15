import SwiftUI

struct WorkoutActivityPoint: Identifiable {
    let id = UUID()
    let date: Date
    let intensity: Int // 0 to 4 for heatmap colors
}

struct WorkoutHeatmapChart: View {
    let activity: [WorkoutActivityPoint]
    
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 4), count: 7)
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("WORKOUT CONSISTENCY")
                .font(.system(size: 11, weight: .black, design: .monospaced))
                .tracking(1.2)
                .foregroundStyle(Brand.Color.accent)
            
            LazyVGrid(columns: columns, spacing: 4) {
                ForEach(activity) { point in
                    RoundedRectangle(cornerRadius: 3)
                        .fill(heatmapColor(for: point.intensity))
                        .aspectRatio(1, contentMode: .fit)
                        .overlay(
                            RoundedRectangle(cornerRadius: 3)
                                .stroke(Color.white.opacity(0.05), lineWidth: 0.5)
                        )
                }
            }
            
            HStack {
                Text("Last 28 Days")
                    .font(.caption2)
                    .foregroundStyle(Brand.Color.muted)
                Spacer()
                HStack(spacing: 4) {
                    Text("Less").font(.system(size: 8))
                    ForEach(0...4, id: \.self) { i in
                        RoundedRectangle(cornerRadius: 2)
                            .fill(heatmapColor(for: i))
                            .frame(width: 8, height: 8)
                    }
                    Text("More").font(.system(size: 8))
                }
                .foregroundStyle(Brand.Color.muted)
            }
        }
        .padding(16)
        .background(Brand.Color.surfaceRaised)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Brand.Color.borderStrong, lineWidth: 1))
    }
    
    private func heatmapColor(for intensity: Int) -> Color {
        switch intensity {
        case 0: return Color.white.opacity(0.05)
        case 1: return Brand.Color.accent.opacity(0.2)
        case 2: return Brand.Color.accent.opacity(0.4)
        case 3: return Brand.Color.accent.opacity(0.7)
        case 4: return Brand.Color.accent
        default: return Color.white.opacity(0.05)
        }
    }
}
