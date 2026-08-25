export const CSS = `
    div.te_container {
        color: white !important;
        width: 100%;
        text-align: center;
        margin-top: 10px;
        margin-bottom: 10px;
        background-color: #3e3e3e;
        border-radius: 4px;
        box-shadow: 0px 2px 4px 2px #7f7f7f;
    }

    table.te_table {
        margin-top:10px;
        text-align: left;
        width: 100%;
        max-width:100%;
    }

    table.te_table tr {
        border-bottom: 1px solid #555555;
    }

    table.te_table th {
        padding: 5px;
        padding-top:8px;
        padding-bottom:8px;
        background-color: #373737;
    }

    table.te_table td {
        color:white;
        padding:5px !important;
    }

    table.te_table td input {
        padding-left: 5px;
    }

    input.te_input {
        border: 1px solid #4e4e4e;
        background-color: #3e3e3e;
        border-radius: 5px;
        height: 20px !important;
        color: white;
        width:100%;
    }

    div.te_header {
        padding-bottom: 2px;
        padding-top: 4px;
        border-bottom: 1px solid #535353;
        border-top-left-radius: 5px;
        border-top-right-radius: 5px;
        background-color: #373737;
    }

    .te_settings_button {
        position: absolute;
        top: 50%;
        right: 10px;
        transform: translateY(-50%);
        background: transparent;
        border: none;
        color: #a0a0a0;
        font-size: 16px;
        cursor: pointer;
        line-height: 1;
        padding: 4px;
    }

    .te_settings_button:hover {
        color: #f7b84b;
    }

    div.te_wrapper {
        padding:10px;
    }

    .te_button {
        background-color: #f7b84b26;
        border-radius: 5px;
        padding: 6px;
        color: #f7b84b;
        font-weight: bold;
        cursor: pointer;
        padding-left: 12px;
        padding-right: 12px;
        border: none;
    }

    .te_button_dark {
        background-color: #000000c2;
        border-radius: 5px;
        padding: 6px;
        color: #f7b84b;
        font-weight: bold;
        cursor: pointer;
        padding-left: 12px;
        padding-right: 12px;
        border: none;
    }

    .te_button:hover {
        background-color: #f7b84b;
        color:white;
    }

    .te_invalid_feedback {
        width: 100%;
        margin-top: .25rem;
        font-size: .875em;
        color: #fba189 !important;
    }

    .te_d_none {
        display:none;
    }

    .te_header_image {
        max-width: 100%;
        height: 40px;
    }

    td.te_item {
        text-align: left;
        font-weight: bold;
    }

    td.te_image {
        text-align: center;
        border: 0px;
    }

    td.te_image img {
        max-width: 40px;
    }

    td.te_profit {
        color: #7CFC00;
    }

    .te_profit_display {
        color: #7CFC00;
    }

    .te_total_info {
        font-size: 12px;
        font-weight: bold;
        text-align: left;
        display: inline-block;
        margin: 4px 2px;
    }

    .te_copy_text a:link,
    .te_copy_text a:visited,
    .te_copy_text a:hover,
    .te_copy_text a:active {
        text-decoration: none;
        color: #89e1fb;
        cursor: pointer;
    }

    .te_profile_button_icon {
        width: 28px;
        height: 28px;
        object-fit: contain;
    }

    .te_profile_button.te_profile_button_disabled .te_profile_button_icon,
    .te_profile_button.te_profile_button_loading .te_profile_button_icon {
        opacity: 0.35;
        filter: grayscale(1);
    }

    .te_trader_info {
        padding: 12px;
        text-align: left;
    }

    .te_trader_info_stats {
        margin-bottom: 10px;
        font-size: 13px;
        color: #cccccc;
    }

    .te_trader_info_stats b {
        color: #f7b84b;
    }

    .te_trader_info_actions {
        display: flex;
        gap: 8px;
        margin-bottom: 10px;
    }

    .te_trader_info_actions .torn-btn {
        flex: 1;
        text-align: center;
    }

    .te_trader_info_actions .torn-btn.disable {
        pointer-events: none;
    }

    .te_trader_info_row {
        padding: 4px 0;
        color: white;
    }

    .te_trader_info_row a {
        color: #89e1fb;
        text-decoration: none;
    }

    .te_trader_info_row a:hover {
        text-decoration: underline;
    }
`;
