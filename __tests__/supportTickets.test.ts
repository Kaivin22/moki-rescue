const insert = jest.fn();

jest.mock('../src/services/supabase', () => ({
  supabase: { from: () => ({ insert }) },
}));

import { createSupportTicket } from '../src/features/support/api/tickets';

describe('support ticket validation', () => {
  beforeEach(() => insert.mockReset());

  it('rejects empty content before calling Supabase', async () => {
    await expect(createSupportTicket({ userId: 'u1', category: 'app_bug', title: ' ', description: 'Nội dung' }))
      .rejects.toThrow('Tiêu đề');
    expect(insert).not.toHaveBeenCalled();
  });

  it('normalizes and submits valid content', async () => {
    insert.mockResolvedValue({ error: null });
    await createSupportTicket({ userId: 'u1', category: 'suggestion', title: '  Góp ý  ', description: '  Nội dung  ' });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ title: 'Góp ý', description: 'Nội dung', status: 'open' }));
  });
});
