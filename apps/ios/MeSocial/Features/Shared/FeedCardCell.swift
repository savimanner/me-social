import SwiftUI

struct FeedCardCell: View {
    let card: FeedCard

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text(card.sources.first?.kind.displayName ?? "Generated")
                    .font(.caption.bold())
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.black.opacity(0.08), in: Capsule())

                Spacer()

                Text(card.score.formatted(.number.precision(.fractionLength(1))))
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
            }

            Text(card.headline)
                .font(.system(size: 28, weight: .bold, design: .serif))
                .foregroundStyle(Color.black.opacity(0.88))

            Text(card.body)
                .font(.body)
                .foregroundStyle(.black.opacity(0.75))
                .lineLimit(5)

            HStack(spacing: 8) {
                ForEach(card.sources.prefix(3)) { source in
                    Text(source.title)
                        .font(.caption)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.white.opacity(0.7), in: Capsule())
                }
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(Color.white.opacity(0.82))
                .shadow(color: Color.black.opacity(0.08), radius: 16, x: 0, y: 12)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .stroke(Color.black.opacity(0.06), lineWidth: 1)
        )
    }
}

