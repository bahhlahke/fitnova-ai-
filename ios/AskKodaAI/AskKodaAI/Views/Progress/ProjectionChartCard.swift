//
//  ProjectionChartCard.swift
//  Koda AI
//
//  Renders a 3-point progress forecast line chart using Swift Charts (iOS 16+).
//  Displays current → +4w → +12w weight projections with a confidence band.
//

import SwiftUI
import Charts

struct ProjectionChartCard: View {
    let current: Double
    let projected4w: Double
    let projected12w: Double
    let rate: Double        // kg/week (positive = gain, negative = loss)
    let confidence: Double  // 0–1

    private struct DataPoint: Identifiable {
        let id: Int
        let label: String
        let week: Int
        let value: Double
        let lower: Double
        let upper: Double
    }

    private var dataPoints: [DataPoint] {
        let halfBand = { (v: Double, weeks: Int) -> Double in
            (1.0 - confidence) * 0.04 * v * Double(weeks + 1)
        }
        return [
            DataPoint(id: 0, label: "Now",  week: 0,  value: current,
                      lower: current - halfBand(current, 0),
                      upper: current + halfBand(current, 0)),
            DataPoint(id: 1, label: "+4w",  week: 4,  value: projected4w,
                      lower: projected4w - halfBand(projected4w, 4),
                      upper: projected4w + halfBand(projected4w, 4)),
            DataPoint(id: 2, label: "+12w", week: 12, value: projected12w,
                      lower: projected12w - halfBand(projected12w, 12),
                      upper: projected12w + halfBand(projected12w, 12)),
        ]
    }

    private var rateCaption: String {
        let sign = rate >= 0 ? "+" : ""
        return "\(sign)\(String(format: "%.2f", rate)) kg/week avg. rate"
    }

    var body: some View {
        PremiumRowCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("PROGRESS FORECAST")
                            .font(.system(size: 11, weight: .black, design: .monospaced))
                            .tracking(1.2)
                            .foregroundStyle(Brand.Color.accent)
                        Text("AI-projected trajectory")
                            .font(.caption)
                            .foregroundStyle(Brand.Color.muted)
                    }
                    Spacer()
                    Text("\(Int(confidence * 100))% confidence")
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundStyle(Brand.Color.success)
                }

                Chart {
                    // Confidence band
                    ForEach(dataPoints) { pt in
                        AreaMark(
                            x: .value("Week", pt.week),
                            yStart: .value("Lower", pt.lower),
                            yEnd: .value("Upper", pt.upper)
                        )
                        .foregroundStyle(Brand.Color.accent.opacity(0.12))
                        .interpolationMethod(.catmullRom)
                    }

                    // Trend line
                    ForEach(dataPoints) { pt in
                        LineMark(
                            x: .value("Week", pt.week),
                            y: .value("Weight (kg)", pt.value)
                        )
                        .foregroundStyle(Brand.Color.accent)
                        .lineStyle(StrokeStyle(lineWidth: 2.5))
                        .interpolationMethod(.catmullRom)
                    }

                    // Data points with annotation labels
                    ForEach(dataPoints) { pt in
                        PointMark(
                            x: .value("Week", pt.week),
                            y: .value("Weight (kg)", pt.value)
                        )
                        .foregroundStyle(Brand.Color.accent)
                        .symbolSize(48)
                        .annotation(position: .top, spacing: 4) {
                            VStack(spacing: 1) {
                                Text(pt.label)
                                    .font(.system(size: 9, weight: .black, design: .monospaced))
                                    .foregroundStyle(Brand.Color.muted)
                                Text(String(format: "%.1f", pt.value))
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundStyle(.white)
                            }
                        }
                    }
                }
                .frame(height: 130)
                .chartXAxis {
                    AxisMarks(values: [0, 4, 12]) { _ in
                        AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                            .foregroundStyle(Color.white.opacity(0.08))
                    }
                }
                .chartYAxis {
                    AxisMarks { _ in
                        AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                            .foregroundStyle(Color.white.opacity(0.08))
                        AxisValueLabel()
                            .foregroundStyle(Brand.Color.muted)
                    }
                }
                .chartPlotStyle { plot in
                    plot.background(Color.clear)
                }

                Text(rateCaption)
                    .font(.system(size: 10, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Brand.Color.muted)
            }
        }
    }
}
