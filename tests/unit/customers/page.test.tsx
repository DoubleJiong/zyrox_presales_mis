// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const toastMock = vi.fn();

vi.mock('../../../src/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { id: 7, realName: '张伟' },
    isAuthenticated: true,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('../../../src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('../../../src/components/auth/PermissionProvider', () => ({
  PermissionButton: ({ children, permission: _permission, hideWhenNoPermission: _hideWhenNoPermission, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('../../../src/lib/permissions', () => ({
  PERMISSIONS: {
    CUSTOMER_EXPORT: 'CUSTOMER_EXPORT',
    CUSTOMER_CREATE: 'CUSTOMER_CREATE',
    CUSTOMER_UPDATE: 'CUSTOMER_UPDATE',
  },
}));

vi.mock('../../../src/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: any) => {
    if (asChild && children) {
      return children;
    }
    return <button {...props}>{children}</button>;
  },
}));

vi.mock('../../../src/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('../../../src/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock('../../../src/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock('../../../src/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

vi.mock('../../../src/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('../../../src/components/ui/table', () => ({
  Table: ({ children, ...props }: any) => <table {...props}><tbody>{children}</tbody></table>,
  TableHeader: ({ children }: any) => <>{children}</>,
  TableBody: ({ children }: any) => <>{children}</>,
  TableHead: ({ children, ...props }: any) => <th {...props}>{children}</th>,
  TableRow: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  TableCell: ({ children, ...props }: any) => <td {...props}>{children}</td>,
}));

vi.mock('../../../src/components/ui/select', () => ({
  Select: ({ children }: any) => <>{children}</>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../../src/components/ui/searchable-select', () => ({
  SearchableSelect: ({ options, value, onValueChange, placeholder }: any) => (
    <select aria-label={placeholder} value={value} onChange={(event) => onValueChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option: any) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  ),
}));

vi.mock('../../../src/components/dictionary/dict-select', () => ({
  DictSelect: ({ value, onValueChange, placeholder }: any) => (
    <select aria-label={placeholder} value={value} onChange={(event) => onValueChange(event.target.value)}>
      <option value="">{placeholder}</option>
      <option value="manufacturing">制造</option>
      <option value="potential">潜在</option>
      <option value="active">活跃</option>
    </select>
  ),
}));

vi.mock('../../../src/components/ui/checkbox', () => ({
  Checkbox: ({ ...props }: any) => <input type="checkbox" {...props} />,
}));

vi.mock('../../../src/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('../../../src/components/ui/drawer', () => ({
  Drawer: ({ children }: any) => <>{children}</>,
  DrawerClose: ({ children }: any) => <>{children}</>,
  DrawerContent: ({ children }: any) => <div>{children}</div>,
  DrawerHeader: ({ children }: any) => <div>{children}</div>,
  DrawerTitle: ({ children }: any) => <div>{children}</div>,
  DrawerFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../../src/components/ui/dialog', async () => {
  const React = await import('react');

  const DialogContext = React.createContext<{ open: boolean; onOpenChange: (open: boolean) => void }>({
    open: false,
    onOpenChange: () => {},
  });

  return {
    Dialog: ({ open = false, onOpenChange = () => {}, children }: any) => (
      <DialogContext.Provider value={{ open, onOpenChange }}>
        {children}
      </DialogContext.Provider>
    ),
    DialogTrigger: ({ children, asChild }: any) => {
      const context = React.useContext(DialogContext);
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, {
          onClick: (event: any) => {
            children.props.onClick?.(event);
            context.onOpenChange(true);
          },
        });
      }
      return <button onClick={() => context.onOpenChange(true)}>{children}</button>;
    },
    DialogContent: ({ children, ...props }: any) => {
      const context = React.useContext(DialogContext);
      return context.open ? <div {...props}>{children}</div> : null;
    },
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <div>{children}</div>,
    DialogDescription: ({ children }: any) => <div>{children}</div>,
    DialogFooter: ({ children }: any) => <div>{children}</div>,
  };
});

function jsonResponse(data: any, ok = true) {
  return {
    ok,
    json: async () => data,
  } as Response;
}

describe('CustomersPage dedup flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
    toastMock.mockReset();
  });

  it('requires confirmation before creating a similar customer', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes('/api/dictionary/options')) {
        return jsonResponse({ success: true, data: { industry: [{ value: 'manufacturing', label: '制造' }], customer_status: [] } });
      }

      if (url.includes('/api/customers?similarTo=')) {
        return jsonResponse({
          success: true,
          data: {
            customers: [
              {
                id: 101,
                customerId: 'CUST101',
                customerName: '杭州数智科技有限公司',
                customerType: '制造',
                region: '杭州市',
                contactName: '王敏',
                updatedAt: '2026-04-11T09:00:00.000Z',
                matchType: 'similar',
              },
            ],
          },
        });
      }

      if (url.includes('/api/customers?')) {
        return jsonResponse({ success: true, data: { customers: [], pagination: { total: 0 } } });
      }

      if (url.endsWith('/api/customers') && init?.method === 'POST') {
        return jsonResponse({ success: true, data: { id: 201 } });
      }

      throw new Error(`Unhandled fetch: ${url}`);
    });

    global.fetch = fetchMock as any;

    const { default: CustomersPage } = await import('../../../src/app/customers/page');
    render(<CustomersPage />);

    await waitFor(() => {
      expect(screen.getByTestId('customers-page')).toBeInTheDocument();
      expect(screen.getByText('暂无客户数据')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('新建客户'));

    const createDialog = screen.getByTestId('customer-create-dialog');
    fireEvent.change(within(createDialog).getByPlaceholderText('请输入客户名称'), { target: { value: '杭州数智科技' } });
    const createComboboxes = within(createDialog).getAllByRole('combobox');
    fireEvent.change(createComboboxes[0], { target: { value: 'manufacturing' } });
    fireEvent.change(createComboboxes[1], { target: { value: '杭州市' } });

    fireEvent.click(screen.getByTestId('customer-create-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('customer-similar-warning')).toBeInTheDocument();
      expect(screen.getByText('发现相似客户，请确认后再继续创建')).toBeInTheDocument();
    });

    expect(fetchMock).not.toHaveBeenCalledWith('/api/customers', expect.objectContaining({ method: 'POST' }));

    fireEvent.click(screen.getByRole('button', { name: '继续创建新客户' }));
    fireEvent.click(screen.getByTestId('customer-create-submit-button'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/customers', expect.objectContaining({ method: 'POST' }));
    });
  });

  it('requires confirmation before saving an edit with similar customer matches', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes('/api/dictionary/options')) {
        return jsonResponse({ success: true, data: { industry: [{ value: 'manufacturing', label: '制造' }], customer_status: [] } });
      }

      if (url.includes('/api/customers?similarTo=')) {
        return jsonResponse({
          success: true,
          data: {
            customers: [
              {
                id: 102,
                customerId: 'CUST102',
                customerName: '杭州智算平台有限公司',
                customerType: '制造',
                region: '杭州市',
                contactName: '李雷',
                updatedAt: '2026-04-11T09:00:00.000Z',
                matchType: 'similar',
              },
            ],
          },
        });
      }

      if (url.includes('/api/customers?')) {
        return jsonResponse({
          success: true,
          data: {
            customers: [
              {
                id: 1,
                customerId: 'CUST001',
                customerName: '原始客户',
                customerType: '制造',
                customerTypeCode: 'manufacturing',
                region: '杭州市',
                status: 'potential',
                totalAmount: '0',
                currentProjectCount: 0,
                lastCooperationDate: null,
                lastInteractionTime: null,
                maxProjectAmount: '0',
                contactName: '张三',
                contactPhone: null,
                contactEmail: null,
                address: null,
                description: null,
                createdAt: '2026-04-10T09:00:00.000Z',
                updatedAt: '2026-04-10T09:00:00.000Z',
              },
            ],
            pagination: { total: 1 },
          },
        });
      }

      if (url.endsWith('/api/customers/1') && init?.method === 'PUT') {
        return jsonResponse({ success: true, data: { id: 1 } });
      }

      throw new Error(`Unhandled fetch: ${url}`);
    });

    global.fetch = fetchMock as any;

    const { default: CustomersPage } = await import('../../../src/app/customers/page');
    render(<CustomersPage />);

    await waitFor(() => {
      expect(screen.getByTestId('customer-edit-button-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('customer-edit-button-1'));

    const editDialog = screen.getByTestId('customer-edit-dialog');
    fireEvent.change(within(editDialog).getByPlaceholderText('请输入客户名称'), { target: { value: '杭州智算平台' } });
    fireEvent.click(screen.getByTestId('customer-edit-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('customer-similar-warning')).toBeInTheDocument();
      expect(screen.getByText('发现相似客户，确认后仍可继续保存')).toBeInTheDocument();
    });

    expect(fetchMock).not.toHaveBeenCalledWith('/api/customers/1', expect.objectContaining({ method: 'PUT' }));

    fireEvent.click(screen.getByRole('button', { name: '继续创建新客户' }));
    fireEvent.click(screen.getByTestId('customer-edit-submit-button'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/customers/1', expect.objectContaining({ method: 'PUT' }));
    });
  });
});