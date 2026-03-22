import { NextRequest, NextResponse } from "next/server";
import { getCachedUser } from "@/lib/auth-cache";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const user = await getCachedUser();

        if (!user || user.id === undefined) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id") || searchParams.get("coupleId");
        const month = searchParams.get("month"); // Format: "2026-02"
        const period = searchParams.get("period") || "month";
        const date = searchParams.get("date");

        if (!id) {
            return NextResponse.json({ error: "id or coupleId is required" }, { status: 400 });
        }

        // Verify user belongs to this couple or is this user
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { couple_id: true },
        });

        if (!dbUser || (dbUser.couple_id !== id && user.id !== id)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const baseDate = date ? new Date(date) : new Date();
        const queryMonth = month || `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, "0")}`;

        // Get budget for the specified month
        const budget = await prisma.budget.findFirst({
            where: {
                month: queryMonth,
                OR: [
                    { couple_id: id },
                    { user_id: id } as never
                ]
            } as never,
        });

        // Convert budget to budget_goals format for frontend compatibility
        const budgetGoals = budget ? {
            monthly_total: parseFloat(budget.monthly_total.toString()),
            his_budget: parseFloat(budget.his_budget.toString()),
            hers_budget: parseFloat(budget.hers_budget.toString()),
            shared_budget: parseFloat(budget.shared_budget.toString()),
        } : null;

        // Calculate date range for current month or specified month
        let startDate: Date;
        let endDate: Date;

        if (month) {
            const [year, monthNum] = month.split("-");
            startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
            endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);
        } else if (period === "day") {
            startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0, 0);
            endDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 23, 59, 59, 999);
        } else if (period === "year") {
            startDate = new Date(baseDate.getFullYear(), 0, 1, 0, 0, 0, 0);
            endDate = new Date(baseDate.getFullYear(), 11, 31, 23, 59, 59, 999);
        } else {
            startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
            endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999);
        }

        // Fetch transactions for the month
        const transactions = await prisma.transaction.findMany({
            where: {
                OR: [
                    { couple_id: id },
                    { user_id: id } as never
                ],
                transaction_date: {
                    gte: startDate,
                    lte: endDate,
                },
            } as never,
        });

        // Calculate income and expenses by payer
        const income = {
            his: 0,
            hers: 0,
            shared: 0,
            total: 0,
        };

        const expenses = {
            his: 0,
            hers: 0,
            shared: 0,
            total: 0,
        };

        transactions.forEach((t) => {
            const amount = parseFloat(t.amount.toString());
            const transactionType = (t as any).type || "EXPENSE";

            if (transactionType === "INCOME") {
                if (t.payer === "HIS") {
                    income.his += amount;
                } else if (t.payer === "HERS") {
                    income.hers += amount;
                } else if (t.payer === "SHARED") {
                    income.shared += amount;
                }
                income.total += amount;
            } else {
                if (t.payer === "HIS") {
                    expenses.his += amount;
                } else if (t.payer === "HERS") {
                    expenses.hers += amount;
                } else if (t.payer === "SHARED") {
                    expenses.shared += amount;
                }
                expenses.total += amount;
            }
        });

        // Calculate balances (base + income - expenses)
        const balance = {
            his: 0,
            hers: 0,
            shared: 0,
            total: 0,
        };

        let percentage = 0;
        let status = "healthy";

        if (budgetGoals && budgetGoals.monthly_total) {
            // Calculate balance for each payer
            balance.his = (budgetGoals.his_budget || 0) + income.his - expenses.his;
            balance.hers = (budgetGoals.hers_budget || 0) + income.hers - expenses.hers;
            balance.shared = (budgetGoals.shared_budget || 0) + income.shared - expenses.shared;
            balance.total = balance.his + balance.hers + balance.shared;

            // Calculate percentage based on expenses vs base budget
            percentage = Math.round((expenses.total / budgetGoals.monthly_total) * 100);

            // Status based on balance
            if (balance.total >= budgetGoals.monthly_total * 0.5) {
                status = "healthy";
            } else if (balance.total >= budgetGoals.monthly_total * 0.2) {
                status = "warning";
            } else {
                status = "over_budget";
            }
        }

        // Calculate category breakdown
        const categoryBreakdown: Record<string, number> = {};
        transactions.forEach((t) => {
            const amount = parseFloat(t.amount.toString());
            categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + amount;
        });

        const summary = {
            month: queryMonth,
            period,
            range: {
                from: startDate.toISOString(),
                to: endDate.toISOString(),
            },
            income,
            expenses,
            balance,
            budget_goals: budgetGoals,
            percentage,
            status,
            transactions_count: transactions.length,
            category_breakdown: categoryBreakdown,
        };

        return NextResponse.json(
            { data: summary },
            {
                status: 200,
                headers: {
                    "Cache-Control": "private, no-cache, no-store, must-revalidate",
                },
            }
        );
    } catch (error: any) {
        console.error("Error fetching budget summary:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch budget summary" },
            { status: 500 }
        );
    }
}
