import argparse
import pandas as pd
import matplotlib.pyplot as plt


if __name__ == "__main__":

    parser = argparse.ArgumentParser(description="Clean price difference data")
    parser.add_argument(
        "--data_dir",
        type=str,
        default="processed",
        help="Directory where the data is stored",
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default="processed",
        help="Directory where the cleaned data will be saved",
    )
    args = parser.parse_args()
    data_dir = args.data_dir
    output_dir = args.output_dir
    
    # Read the data
    df = pd.read_csv(f"{data_dir}/mapc_region_residential_sales_clean_aggregated.csv")
    
    # plot the sums over time!
    plt.figure(figsize=(12, 6))
    plt.subplot(1, 2, 1)
    # plot investor sold ones only
    plt.plot(df["year"], df["investor_price_diff_mean"], label="Investor Sold", color="blue")
    # plot non investor sold ones only
    plt.plot(df["year"], df["non_investor_price_diff_mean"], label="Non Investor Sold", color="orange")
    plt.title("Average Profit-per-transaction Over Time")
    plt.xlabel("Year")
    plt.ylabel("Price Difference")
    plt.legend()
    plt.grid()
    plt.subplot(1, 2, 2)
    # plot investor sold ones only
    plt.plot(df["year"], df["mean_profit_diff"])
    plt.title("Profit Difference Over Time (Investor - NonInvestor)")
    plt.xlabel("Year")
    plt.ylabel("Mean Profit Difference")
    plt.grid()
    plt.tight_layout()
    # save the figure
    plt.savefig(f"{output_dir}/price_difference_over_time.png")
