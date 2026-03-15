import SwiftUI
import Charts

struct StrengthTrendPoint: Identifiable {
    let id = UUID()
    let date: Date
    let e1rm: Double
}

struct StrengthTrendChart: View {
    let exerciseName: String
    let points: [StrengthTrendPoint]
    
    private var chartMax: Double {
        (points.map { $0.e1rm }.max() ?? 100) * 1.1
    }
    
    private var chartMin: Double {
        (points.map { $0.e1rm }.min() ?? 0) * 0.9
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(exerciseName.uppercased())
                        .font(.system(size: 10, weight: .black, design: .monospaced))
                        .foregroundStyle(Brand.Color.accent)
                    Text("EST. 1RM TREND")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Brand.Color.muted)
                }
                Spacer()
                if let latest = points.last?.e1rm {
                    Text("\(Int(latest)) kg")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .italic()
                        .foregroundStyle(.white)
                }
            }
            
            Chart {
                ForEach(points) { point in
                    LineMark(
                        x: .value("Date", point.date),
                        y: .value("E1RM", point.e1rm)
                    )
                    .interpolationMethod(.catmullRom)
                    .foregroundStyle(Brand.Color.accent)
                    
                    AreaMark(
                        x: .value("Date", point.date),
                        y: .value("E1RM", point.e1rm)
                    )
                    .interpolationMethod(.catmullRom)
                    .foregroundStyle(LinearGradient(
                        colors: [Brand.Color.accent.opacity(0.1), .clear],
                        startPoint: .top,
                        endPoint: .bottom
                    ))
                }
            }
            .chartYScale(domain: chartMin...chartMax)
            .chartXAxis {
                AxisMarks(values: .stride(by: .day, count: 7)) { value in
                    AxisValueLabel(format: .dateTime.month().day())
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisValueLabel()
                }
            }
            .frame(height: 120)
        }
        .padding(16)
        .background(Brand.Color.surfaceRaised)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Brand.Color.borderStrong, lineWidth: 1))
    }
}
