import SwiftUI

struct NativeBodyHeatmap: View {
    let readiness: [String: Int]
    @State private var showBack = false
    @State private var rotation: Double = 0
    
    private let muscles = [
        "Chest", "Back", "Shoulders", "Quads", "Hamstrings", 
        "Glutes", "Biceps", "Triceps", "Core", "Calves"
    ]
    
    var body: some View {
        VStack(spacing: 24) {
            // Anatomy Toggle
            HStack(spacing: 12) {
                anatomyButton(title: "Anterior", isActive: !showBack) {
                    withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
                        showBack = false
                    }
                }
                
                anatomyButton(title: "Posterior", isActive: showBack) {
                    withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
                        showBack = true
                    }
                }
            }
            .padding(6)
            .background(Color.white.opacity(0.05))
            .clipShape(Capsule())
            
            // Sexier Body Container
            ZStack {
                if !showBack {
                    AnatomyView(view: .front, readiness: readiness)
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .scale(scale: 0.9)).animation(.spring().delay(0.2)),
                            removal: .opacity.combined(with: .scale(scale: 1.1))
                        ))
                } else {
                    AnatomyView(view: .back, readiness: readiness)
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .scale(scale: 0.9)).animation(.spring().delay(0.2)),
                            removal: .opacity.combined(with: .scale(scale: 1.1))
                        ))
                }
            }
            .frame(height: 380)
            .rotation3DEffect(
                .degrees(showBack ? 180 : 0),
                axis: (x: 0, y: 1, z: 0),
                perspective: 0.4
            )
            .animation(.spring(response: 0.8, dampingFraction: 0.7), value: showBack)
            
            // Legend
            HStack(spacing: 16) {
                Text("FATIGUED")
                    .font(.system(size: 9, weight: .black, design: .monospaced))
                    .foregroundStyle(Brand.Color.danger)
                
                Capsule()
                    .fill(LinearGradient(
                        colors: [.red, .orange, .green, Brand.Color.accent],
                        startPoint: .leading,
                        endPoint: .trailing
                    ))
                    .frame(height: 2)
                    .overlay {
                        Capsule().stroke(Color.white.opacity(0.1), lineWidth: 0.5)
                    }
                
                Text("OPTIMAL")
                    .font(.system(size: 9, weight: .black, design: .monospaced))
                    .foregroundStyle(Brand.Color.accent)
            }
            .padding(.horizontal, 20)
        }
    }
    
    private func anatomyButton(title: String, isActive: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title.uppercased())
                .font(.system(size: 10, weight: .black, design: .monospaced))
                .tracking(1)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isActive ? Brand.Color.surfaceHover : Color.clear)
                .foregroundStyle(isActive ? .white : .white.opacity(0.3))
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

enum AnatomyOrientation {
    case front, back
}

struct AnatomyView: View {
    let view: AnatomyOrientation
    let readiness: [String: Int]
    
    var body: some View {
        ZStack {
            // Skeleton Base
            Image(systemName: "figure.stand")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .foregroundStyle(.white.opacity(0.05))
                .padding(20)
            
            // Muscle Overlays (Represented as Shapes for high-performance SwiftUI)
            // Note: In a real app we'd use complex Paths, here we use visual representations
            // that mimic the 'sexier' look with glows.
            
            GeometryReader { geo in
                ZStack {
                    if view == .front {
                        muscleHighlight(name: "Chest", rect: CGRect(x: 0.35, y: 0.2, w: 0.3, h: 0.1), geo: geo)
                        muscleHighlight(name: "Quads", rect: CGRect(x: 0.32, y: 0.55, w: 0.36, h: 0.25), geo: geo)
                        muscleHighlight(name: "Shoulders", rect: CGRect(x: 0.25, y: 0.2, w: 0.5, h: 0.1), geo: geo)
                        muscleHighlight(name: "Core", rect: CGRect(x: 0.4, y: 0.32, w: 0.2, h: 0.15), geo: geo)
                    } else {
                        muscleHighlight(name: "Back", rect: CGRect(x: 0.32, y: 0.2, w: 0.36, h: 0.25), geo: geo)
                        muscleHighlight(name: "Glutes", rect: CGRect(x: 0.35, y: 0.46, w: 0.3, h: 0.1), geo: geo)
                        muscleHighlight(name: "Hamstrings", rect: CGRect(x: 0.32, y: 0.58, w: 0.36, h: 0.2), geo: geo)
                        muscleHighlight(name: "Triceps", rect: CGRect(x: 0.26, y: 0.3, w: 0.48, h: 0.12), geo: geo)
                    }
                }
            }
            
            // Scanning line
            ScanningLine()
        }
        // Mirror the back view so it feels like a rotation
        .rotation3DEffect(.degrees(view == .back ? 180 : 0), axis: (x: 0, y: 1, z: 0))
    }
    
    private func muscleHighlight(name: String, rect: CGRect, geo: GeometryProxy) -> some View {
        let score = readiness[name] ?? 50
        let color = colorForScore(score)
        
        return RoundedRectangle(cornerRadius: 8)
            .fill(color.opacity(0.6))
            .blur(radius: 4)
            .overlay {
                RoundedRectangle(cornerRadius: 8)
                    .stroke(color, lineWidth: 1.5)
                    .shadow(color: color, radius: 6)
            }
            .frame(
                width: geo.size.width * rect.width,
                height: geo.size.height * rect.height
            )
            .position(
                x: geo.size.width * rect.origin.x + (geo.size.width * rect.width / 2),
                y: geo.size.height * rect.origin.y + (geo.size.height * rect.height / 2)
            )
            .opacity(0.8)
    }
    
    private func colorForScore(_ score: Int) -> Color {
        if score >= 80 { return Brand.Color.accent }
        if score >= 60 { return .green }
        if score >= 35 { return .orange }
        return .red
    }
}

struct ScanningLine: View {
    @State private var offset: CGFloat = -1
    
    var body: some View {
        GeometryReader { geo in
            Rectangle()
                .fill(LinearGradient(
                    colors: [.clear, Brand.Color.accent.opacity(0.3), .clear],
                    startPoint: .top,
                    endPoint: .bottom
                ))
                .frame(height: 60)
                .overlay {
                    Rectangle()
                        .fill(Brand.Color.accent)
                        .frame(height: 1)
                        .shadow(color: Brand.Color.accent, radius: 10)
                }
                .offset(y: geo.size.height * offset)
                .onAppear {
                    withAnimation(.linear(duration: 4).repeatForever(autoreverses: false)) {
                        offset = 1.2
                    }
                }
        }
        .clipped()
    }
}

extension CGRect {
    init(x: CGFloat, y: CGFloat, w: CGFloat, h: CGFloat) {
        self.init(origin: CGPoint(x: x, y: y), size: CGSize(width: w, height: h))
    }
}
