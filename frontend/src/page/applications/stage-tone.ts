type SurfaceTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export function stageTone(status: string): SurfaceTone {
  switch (status) {
    case 'applied':
      return 'primary';
    case 'screening':
      return 'info';
    case 'interview':
      return 'warning';
    case 'offer':
      return 'success';
    case 'rejected':
      return 'danger';
    case 'registered':
    case 'withdrawn':
    default:
      return 'neutral';
  }
}
