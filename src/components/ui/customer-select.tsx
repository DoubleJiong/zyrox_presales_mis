"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface CustomerOption {
  id: number
  customerName: string
  customerType?: string | null
  customerTypeCode?: string | null
  defaultProjectTypeCode?: string | null
  region?: string | null
}

interface CustomerSelectProps {
  customers: CustomerOption[]
  value?: string
  onValueChange: (value: string, customer?: CustomerOption) => void
  onSearch?: (term: string) => void
  placeholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
}

export function CustomerSelect({
  customers,
  value,
  onValueChange,
  onSearch,
  placeholder = "选择客户...",
  emptyText = "未找到客户",
  className,
  disabled = false,
}: CustomerSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState(value || "")

  // 当外部value变化时更新search
  React.useEffect(() => {
    if (value) {
      setSearch(value)
    }
  }, [value])

  // 根据搜索词过滤客户
  const filteredCustomers = React.useMemo(() => {
    // 如果没有搜索词且没有value，显示所有客户
    if (!search && !value) return customers
    // 如果搜索词和value相同，说明用户没有在搜索，显示所有客户
    if (search === value) return customers
    // 否则根据搜索词过滤
    const searchLower = search.toLowerCase()
    return customers.filter((customer) =>
      customer.customerName.toLowerCase().includes(searchLower) ||
      (customer.customerType?.toLowerCase().includes(searchLower)) ||
      (customer.region?.toLowerCase().includes(searchLower))
    )
  }, [customers, search, value])

  const selectedCustomer = customers.find(c => c.customerName === value)

  const handleSearch = (term: string) => {
    setSearch(term)
    onSearch?.(term)
  }

  const handleSelect = (customer: CustomerOption) => {
    setSearch(customer.customerName)
    onValueChange(customer.customerName, customer)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
          disabled={disabled}
        >
          <span className="flex items-center gap-2 truncate">
            {selectedCustomer ? (
              <>
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{selectedCustomer.customerName}</span>
              </>
            ) : value ? (
              <>
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{value}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="搜索客户名称..." 
            value={search}
            onValueChange={handleSearch}
          />
          <CommandList className="max-h-[200px]">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {filteredCustomers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={String(customer.id)}
                  onSelect={() => handleSelect(customer)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === customer.customerName ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{customer.customerName}</span>
                    {(customer.customerType || customer.region) && (
                      <span className="text-xs text-muted-foreground">
                        {[customer.customerType, customer.region].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
