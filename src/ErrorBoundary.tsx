import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  failed: boolean;
}

/**
 * Chặn lỗi không lường trước (nội dung hỏng, thiết bị không tạo được WebGL...) để người chơi thấy một màn thông báo
 * thay vì trang trắng. Không hiện chi tiết lỗi ra màn hình (không lộ đường dẫn, tên file); chi tiết chỉ ở console.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('Game gặp lỗi:', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="setup" role="alert">
        <h1>Ôi, game bị vấp</h1>
        <p>Có lỗi khi chạy game. Bạn thử tải lại trang nhé.</p>
        <p>
          <small>Nếu vẫn lỗi, có thể máy hoặc trình duyệt chưa hỗ trợ đồ họa 3D (WebGL). Thử trình duyệt khác hoặc cập nhật trình duyệt.</small>
        </p>
        <button className="choice start" onClick={() => window.location.reload()}>
          Tải lại trang
        </button>
      </main>
    );
  }
}
